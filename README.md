## Goal

As someone deploying Quay to Kubernetes, I want to provide a directory containing my `config.yaml` and some custom SSL certs and receive k8s manifests which are `kubectl create` ready in order to declaratively manage my Quay deployment.

## Anti-Goals

- Use any form of templating (writing k8s YAML is enough)
- Application lifecycle management (beyond what native k8s controllers provide)

## Usage

This repository is intended as a _template_ for your unique Quay installation. 
Create a copy, add your secrets, values, and certs, choose which features you want enabled, and deploy!

### Prerequisites 

- `go` v1.14+

1. Use the `app/` directory to "kustomize" your Quay deployment.
  - Uncomment items under `resources` to include them in your deployment
  - Add other Quay config fields to `bundle/config.yaml`
  - Add custom SSL cert files to `bundle/ssl.key` and `bundle/ssl.cert` and uncomment them under `secretGenerator` in `kustomization.yaml`
  - Add extra SSL cert files needed by Quay to talk to external services to `bundle` directory and add them to `secretGenerator` in `kustomization.yaml`

2. When you are ready to generate the final deployment files, run the following:
```sh
$ mkdir ./output
$ go run main.go
```

This is a small Go program which internally uses `kustomize` as a library, then properly formats the `quay-config-secret`.

3. Now you can simply use `kubectl` or any other Kubernetes client to deploy Quay:
```sh
$ kubectl create -n quay-enterprise -f ./output
```

4. Teardown is as simple as running:
```sh
$ kubectl delete -n quay-enterprise -f ./output
```

Be sure to `git commit` your changes to adhere to configuration-as-code! 
You can use `git-crypt` to protect your secrets, like database credentials and access keys.

### Known Limitations

- This tool does not provide validation of the resulting `quay-config-secret`
- If you choose to use an unmanaged external service (database/storage/Redis/Clair), you must add the appropriate `<CONFIG_FIELD>: <value>` entries to `app/bundle/config.yaml`
- On OCP, you need to run `oc adm policy add-scc-to-user anyuid system:serviceaccount:quay-enterprise:default` before deploying
- Need to manually point DNS to the created Quay `Service` with `type: LoadBalancer` (ensure it matches `SERVER_HOSTNAME` in `config.yaml`)

### Future Work

- [x] Use `kustomize` as a library instead of CLI
- [x] Use [Kustomize `components`](https://github.com/kubernetes-sigs/kustomize/blob/master/examples/components.md) instead of `variants` for more DRY code
- [ ] Use other Operators to provide external services (like CrunchyDB Postgres Operator, Redis Operator, etc...)
- [ ] Refactor into Go module which can be imported by other tools
- [ ] Quay Operator which provides application lifecycle management using this tool
- [ ] Add `ownerReferences` to all created resources for easy tracking and cleanup
