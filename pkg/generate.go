package generate

import (
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v2"
	"sigs.k8s.io/kustomize/api/filesys"
	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/api/resmap"
	"sigs.k8s.io/kustomize/api/resource"
)

func check(err error) {
	if err != nil {
		panic(err)
	}
}

// TODO(alecmerdler): Write function which takes a `QuayEcosystem` and "inflates" it into a `kustomize` directory...

func Generate() (*resmap.ResMap, error) {
	fSys := filesys.MakeFsInMemory()
	fSys.WriteFile("kustomization.yaml")

	opts := &krusty.Options{}
	k := krusty.MakeKustomizer(fSys, opts)
	m, err := k.Run(".")
	check(err)

	err = emitResources(fSys, m)
	check(err)
}

// NOTE: Functions below adapted from Kustomize (https://sourcegraph.com/github.com/kubernetes-sigs/kustomize/-/blob/kustomize/internal/commands/build/build.go)

func emitResources(fSys filesys.FileSystem, m resmap.ResMap) error {
	return writeIndividualFiles(fSys, "./output", m)
}

func writeIndividualFiles(fSys filesys.FileSystem, folderPath string, m resmap.ResMap) error {
	byNamespace := m.GroupedByCurrentNamespace()
	for namespace, resList := range byNamespace {
		for _, res := range resList {
			fName := fileName(res)
			if len(byNamespace) > 1 {
				fName = strings.ToLower(namespace) + "_" + fName
			}
			err := writeFile(fSys, folderPath, fName, res)
			if err != nil {
				return err
			}
		}
	}
	for _, res := range m.NonNamespaceable() {
		err := writeFile(fSys, folderPath, fileName(res), res)
		if err != nil {
			return err
		}
	}
	return nil
}

func fileName(res *resource.Resource) string {
	return strings.ToLower(res.GetGvk().String()) +
		"_" + strings.ToLower(res.GetName()) + ".yaml"
}

func writeFile(fSys filesys.FileSystem, path, fName string, res *resource.Resource) error {
	out, err := yaml.Marshal(res.Map())
	if err != nil {
		return err
	}
	return fSys.WriteFile(filepath.Join(path, fName), out)
}
