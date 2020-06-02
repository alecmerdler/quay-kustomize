package main

import (
	"encoding/base64"
	"fmt"
	"io/ioutil"
	"path"
	"strings"

	"gopkg.in/yaml.v2"
)

func isConfigField(field string) bool {
	return !strings.Contains(field, ".")
}

func check(err error) {
	if err != nil {
		panic(err)
	}
}

// Takes each `QUAY_CONFIG_FIELD` from the generated `Secret` and shoves it under a single `config.yaml` key
// (because that's what Quay wants).
//
// Usage: rm -rf ./output/test && kustomize build ./test -o ./output/test && go run main.go
func main() {
	quayConfigSecretFile := ""

	files, err := ioutil.ReadDir("output")
	check(err)
	for _, f := range files {
		if strings.Contains(f.Name(), "quay-config-secret") {
			quayConfigSecretFile = f.Name()
			break
		}
	}

	yamlFile, err := ioutil.ReadFile(path.Join("output", quayConfigSecretFile))
	check(err)

	// TODO(alecmerdler): Use actual k8s `Secret` struct here...
	var quayConfigSecret map[string]interface{}
	err = yaml.Unmarshal(yamlFile, &quayConfigSecret)
	check(err)

	configYAML := quayConfigSecret["data"].(map[interface{}]interface{})["config.yaml"]
	decodedConfigYAML, err := base64.StdEncoding.DecodeString(configYAML.(string))
	check(err)

	var config map[string]interface{}
	err = yaml.Unmarshal(decodedConfigYAML, &config)
	check(err)

	for key, val := range quayConfigSecret["data"].(map[interface{}]interface{}) {
		if isConfigField(key.(string)) {
			decoded, err := base64.StdEncoding.DecodeString(val.(string))
			if err != nil {
				panic(err)
			}

			var decodedVal interface{}
			err = yaml.Unmarshal(decoded, &decodedVal)
			check(err)

			config[key.(string)] = decodedVal
			delete(quayConfigSecret["data"].(map[interface{}]interface{}), key)
		}
	}

	modifiedConfigYAML, err := yaml.Marshal(config)
	check(err)

	fmt.Println(string(modifiedConfigYAML))

	encodedConfigYAML := base64.StdEncoding.EncodeToString(modifiedConfigYAML)
	quayConfigSecret["data"].(map[interface{}]interface{})["config.yaml"] = encodedConfigYAML
	modifiedYAMLFile, err := yaml.Marshal(quayConfigSecret)
	check(err)

	err = ioutil.WriteFile(path.Join("output", quayConfigSecretFile), modifiedYAMLFile, 0644)
	check(err)

	fmt.Println("Successfully updated config secret.")
}
