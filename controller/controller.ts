import * as k8s from '@kubernetes/client-node';
import { safeLoad } from 'js-yaml';

import { QuayEcosystem, QuayEcosystemList } from './types';
import { generate } from './kustomize';

const apiPath = '/apis/quay.coreos.com/v1alpha1/quayecosystems';

const quayEcosystemGroupVersionKind = {
  group: 'quay.coreos.com',
  version: 'v1alpha1',
  kind: 'QuayEcosystem',
  plural: 'quayecosystems',
};

const start = async() => {
  const kubeConfig = new k8s.KubeConfig();
  kubeConfig.loadFromDefault();

  const quayEcosystemClient = kubeConfig.makeApiClient(k8s.CustomObjectsApi);
  const corev1Client = kubeConfig.makeApiClient(k8s.CoreV1Api);

  const listFn = () => quayEcosystemClient.listNamespacedCustomObject(
    quayEcosystemGroupVersionKind.group,
    quayEcosystemGroupVersionKind.version,
    '',
    quayEcosystemGroupVersionKind.plural,
  ).then(res => ({response: res.response, body: res.body as QuayEcosystemList}));


  const informer = k8s.makeInformer(kubeConfig, apiPath, listFn);

  const updateStatus = (obj: QuayEcosystem) => (newStatus: QuayEcosystem['status']) => {
    return quayEcosystemClient.replaceNamespacedCustomObjectStatus(
      quayEcosystemGroupVersionKind.group,
      quayEcosystemGroupVersionKind.version,
      obj.metadata.namespace,
      quayEcosystemGroupVersionKind.plural,
      obj.metadata!.name,
      {...obj, status: newStatus} as QuayEcosystem,
    );
  };
  
  informer.on('add', async(obj: QuayEcosystem) => {
    console.log(`Added: ${obj.metadata!.name}`);
    console.log(JSON.stringify(obj, null, 2));

    const secret: k8s.V1Secret = await corev1Client.readNamespacedSecret(obj.spec.configBundleSecret, obj.metadata.namespace)
      .then(({body: secret}) => secret)
      .catch(err => {
        console.error(err);
        return null;
      });

    if (secret === null) {
      const status: QuayEcosystem['status'] = {
        conditions: [{
          type: 'QuayConfigInvalid',
          status: 'True',
          reason: 'SecretNotFound',
          message: `referenced config secret ${obj.spec.configBundleSecret} not found`,
          lastHeartbeatTime: '2020-06-11T15:53:31Z',
          lastTransitionTime: '2020-06-11T15:53:31Z',
        }],
      };

      updateStatus(obj)(status)
        .then(resp => {
          console.log(resp.body);
        })
        .catch(err => {
          console.error(err);
        });
    } else {
      const baseConfig = safeLoad(Buffer.from(secret.data['config.yaml'], 'base64').toString());
      console.log(baseConfig);

      const status: QuayEcosystem['status'] = {
        conditions: [{
          type: 'QuayConfigInvalid',
          status: 'False',
          reason: 'QuayConfigValid',
          message: `referenced config secret ${obj.spec.configBundleSecret} is valid`,
          lastHeartbeatTime: '2020-06-11T15:53:31Z',
          lastTransitionTime: '2020-06-11T15:53:31Z',
        }],
      };

      updateStatus(obj)(status)
        .then(resp => {
          console.log(resp.body);
        })
        .catch(err => {
          console.error(err);
        });

      generate(secret.data, obj.spec.managedComponents, obj.metadata.namespace);
    }
  });
  informer.on('update', (obj: QuayEcosystem) => {
    console.log(`Updated: ${obj.metadata!.name}`);

    // TODO(alecmerdler): Reconcile CR with deployed resources
  });
  informer.on('delete', (obj: QuayEcosystem) => {
    console.log(`Deleted: ${obj.metadata!.name}`);

    // TODO(alecmerdler): Cleanup deployed resources
  });
  informer.on('error', (err: QuayEcosystem) => {
    console.error(err);

    // TODO(alecmerdler): Better error handling
    setTimeout(() => {
      informer.start();
    }, 5000);
  });

  console.log(`Starting controller...`);

  informer.start();
};

start();
