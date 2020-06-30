package generate

import metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

// QuayEcoysystem represents a full Quay installation.
type QuayEcosystem struct {
	metav1.TypeMeta
	metav1.ObjectMeta
	Spec   QuayEcosystemSpec
	Status QuayEcosystemStatus
}

// QuayEcosystemSpec is the specification of a QuayEcosystem.
type QuayEcosystemSpec struct {
	ConfigBundleSecret string
	Version            string
	ManagedComponents  []ManagedComponent
}

// ManagedComponent is a necessary but separate component of a Quay installation.
type ManagedComponent struct {
	Kind string
}

// A QuayEcosystemStatus is the status of a QuayEcosystem.
type QuayEcosystemStatus struct {
	RegistryEndpoint string
	ComponentStatus  []ComponentStatus
	// FIXME(alecmerdler): Report how many running pods for each component...?
	Conditions []QuayEcosystemCondition
}

type ComponentStatus struct {
	Type      string
	Component string
}

type QuayEcosystemCondition struct {
}
