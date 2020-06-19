package generate

import (
	"sigs.k8s.io/kustomize/api/filesys"
	"sigs.k8s.io/kustomize/api/krusty"
	"sigs.k8s.io/kustomize/api/resmap"
)

func check(err error) {
	if err != nil {
		panic(err)
	}
}

func Generate() (*resmap.ResMap, error) {
	fSys := filesys.MakeFsInMemory()
	// FIXME(alecmerdler): Add `appDir` to
	opts := &krusty.Options{}
	k := krusty.MakeKustomizer(fSys, opts)
	m, err := k.Run(appDir)
	check(err)

	err = emitResources(fSys, m)
	check(err)
}
