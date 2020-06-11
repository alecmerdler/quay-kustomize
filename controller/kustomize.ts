import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { safeDump } from 'js-yaml';
import { execSync } from 'child_process';
import { ManagedComponent } from './types';

export const kustomizationFor = (managedComponents: ManagedComponent[]) => {
  return {
    apiVersion: 'kustomize.config.k8s.io/v1beta1',
    kind: 'Kustomization',
    resources: [
      '../base',
    ],
    components: managedComponents.map(c => `../components/${c.kind}`),
    secretGenerator: [{
      name: 'quay-config-secret',
      behavior: 'merge',
      files: [
        './bundle/config.yaml',
        './bundle/ssl.cert',
        './bundle/ssl.key',
      ],
    }]
  }
};

/**
 * Hacky way of shelling out to write a `kustomize` directory on disk and call CLI commands...
 */
export const generate = (bundle: {[key: string]: string}, managedComponents: ManagedComponent[], namespace: string) => {
  const dir = './tmpDir';
  
  if (!existsSync(join('..', dir))) {
    mkdirSync(join('..', dir));
    mkdirSync(join('..', dir, 'bundle'));
  }

  writeFileSync(join('..', dir, 'kustomization.yaml'), safeDump(kustomizationFor(managedComponents)));

  Object.keys(bundle).forEach(key => {
    if (key === 'config.yaml') {
      writeFileSync(join('..', dir, 'bundle', 'config.yaml'), Buffer.from(bundle[key], 'base64'));
    } else {
      writeFileSync(join('..', dir, 'bundle', key), bundle[key]);
    }
  });

  // Run commands
  [
    `APP_DIR=${dir} go run main.go`,
    `kubectl create -n ${namespace} -f ./output`,
  ].forEach(command => {
    console.log('Running command: ', command);
    const result = execSync(command, {cwd: '../'});
    console.log('Result: ', result.toString());
  })
};
