import { KubernetesObject, KubernetesListObject } from '@kubernetes/client-node';

export type ManagedComponent = {
  kind: 'database' | 'redis' | 'clair' | 'storage';
};

export type QuayEcosystemCondition = {

};

export type QuayEcosystem = {
  apiVersion: 'quay.coreos.com/v1alpha1';
  kind: 'QuayEcosystem';
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    configBundleSecret: string;
    managedComponents?: ManagedComponent[];
  };
  status?: {
    registryURL?: string;
    conditions?: QuayEcosystemCondition[];
  };
} & KubernetesObject;

export type QuayEcosystemList = KubernetesListObject<QuayEcosystem>;
