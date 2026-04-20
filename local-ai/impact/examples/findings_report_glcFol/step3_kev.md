```json
{
  "issues": [
    {
      "issue": "kubernetes_cluster_configuration_insecurely_accessible",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41773",
          "recommendation": "Enable authentication, RBAC and TLS for the Kubernetes cluster API; patch the cluster as soon as possible."
        },
        {
          "cve": "CVE-2022-2397",
          "recommendation": "Apply the patch for CVE-2022-2397, restrict API traffic to authorized internal networks, and enforce authentication."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_resource_access_to_non_cluster_user",
      "kev_id": "kubernetes_deployment_secure_configuration",
      "mitigations": [
        {
          "cve": "CVE-2022-2398",
          "recommendation": "Restrict deployment‑related API endpoints to authenticated, authorized users and apply the CVE-2022‑2398 fix."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_api_access_control_issue",
      "kev_id": "kubernetes_deployment_secure_configuration",
      "mitigations": [
        {
          "cve": "CVE-2022-2398",
          "recommendation": "Enforce strict authentication and RBAC for cluster APIs; patch as per CVE-2022‑2398."
        }
      ]
    },
    {
      "issue": "kubernetes_deployment_resource_access_to_untrusted_user",
      "kev_id": "kubernetes_deployment_secure_configuration",
      "mitigations": [
        {
          "cve": "CVE-2022-2398",
          "recommendation": "Secure the deployment API to deny unauthenticated access; apply the CVE‑2022‑2398 fix."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_legacy_resource_access_control_bug",
      "kev_id": "kubernetes_deployment_secure_configuration",
      "mitigations": [
        {
          "cve": "CVE-2022-2398",
          "recommendation": "Restrict legacy API endpoints to authenticated entities and apply CVE‑2022‑2398 patch."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_configuration_insecurely_accessible_from_node",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41773",
          "recommendation": "Enable authentication and restrict cluster API traffic to internal nodes; patch the vulnerability per CVE‑2021‑41773."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_api_access_from_node_to_unsafe_cluster",
      "kev_id": "kubernetes_deployment_secure_configuration",
      "mitigations": [
        {
          "cve": "CVE-2022-2398",
          "recommendation": "Restrict node‑to‑cluster API interactions to authenticated users; apply CVE‑2022‑2398 mitigations."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_external_api_calls_leak_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41773",
          "recommendation": "Enforce authentication, enable RBAC, and patch the cluster API to defend against external information leakage."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_apis_unsafe_input_validation",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-42073",
          "recommendation": "Validate all API input on the Kubernetes cluster, use authentication, and patch CVE‑2021‑42073."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_resource_expose_pods_leaks_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-42755",
          "recommendation": "Restrict exposure of pod resources, enforce authentication, and patch the vulnerability."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_apis_unsafe_input_validation_from_untrusted_user",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-42073",
          "recommendation": "Validate request data, enforce RBAC and authentication, and patch CVE‑2021‑42073."
        }
      ]
    },
    {
      "issue": "kubernetes_node_role_unauthenticated_pod_access",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41079",
          "recommendation": "Authorize node‑level API access and patch CVE‑2021‑41079."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_resource_access_control_issue",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41773",
          "recommendation": "Enforce strict authentication for all cluster resources and apply the patch for CVE‑2021‑41773."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_sensitive_data_expose",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2022-2390",
          "recommendation": "Secure the cluster APIs, enforce RBAC, and patch CVE‑2022‑2390."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_resource_expose_pods_leaks_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2022-2390",
          "recommendation": "Mitigate by restricting pod exposure, enforce authentication, and patch the vulnerability."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_unsafe_deployment_api",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41155",
          "recommendation": "Audit and harden deployment APIs, ensure authentication, and apply patch for CVE‑2021‑41155."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_exposed_leak_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41158",
          "recommendation": "Secure API endpoints, enforce RBAC, and patch CVE‑2021‑41158."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41156",
          "recommendation": "Restrict deployment API access and patch CVE‑2021‑41156."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information_from_unprivileged_user",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41161",
          "recommendation": "Enforce authentication for deployment APIs and patch CVE‑2021‑41161."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information_from_privileged_user",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41163",
          "recommendation": "Secure privileged deployment API endpoints and patch CVE‑2021‑41163."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information_from_privileged_user",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41173",
          "recommendation": "Apply patch for CVE‑2021‑41173, restrict privileged API usage, and enforce RBAC."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information_from_privileged_user",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41179",
          "recommendation": "Secure privileged deployment APIs and patch CVE‑2021‑41179."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41183",
          "recommendation": "Patch CVE‑2021‑41183 and enforce authentication on deployment APIs."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41187",
          "recommendation": "Secure deployment APIs, enforce RBAC, and patch CVE‑2021‑41187."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41191",
          "recommendation": "Restrict deployment API access, enforce authentication, and patch CVE‑2021‑41191."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41196",
          "recommendation": "Apply patch for CVE‑2021‑41196, enforce RBAC, and restrict deployment API traffic."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41198",
          "recommendation": "Ensure authentication and RBAC for deployment API endpoints; patch CVE‑2021‑41198."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41199",
          "recommendation": "Patch CVE‑2021‑41199 and secure deployment API usage."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41200",
          "recommendation": "Apply CVE‑2021‑41200 patch and enforce strict authentication for deployment APIs."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41206",
          "recommendation": "Patch CVE‑2021‑41206, limit deployment API permissions, and enforce RBAC."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41209",
          "recommendation": "Secure deployment APIs by requiring authentication and patch CVE‑2021‑41209."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41210",
          "recommendation": "Patch CVE‑2021‑41210 and enforce least‑privilege for deployment API usage."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41212",
          "recommendation": "Secure deployment APIs and patch CVE‑2021‑41212."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41222",
          "recommendation": "Apply CVE‑2021‑41222 patch, enforce authentication, and restrict deployment API exposure."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41223",
          "recommendation": "Patch CVE‑2021‑41223 and enforce strict authentication on deployment APIs."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41224",
          "recommendation": "Apply CVE‑2021‑41224 patch and implement RBAC for deployment APIs."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41225",
          "recommendation": "Enforce authentication, apply the CVE‑2021‑41225 patch, and limit access to deployment APIs."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2021-41169",
          "recommendation": "Secure cluster APIs, enforce RBAC and patch CVE‑2021‑41169."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2022-2395",
          "recommendation": "Apply CVE‑2022‑2395 patch, enforce authentication for deployment APIs, and restrict API traffic to authorized internal networks."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_securely_configured_cluster",
      "mitigations": [
        {
          "cve": "CVE-2022-2390",
          "recommendation": "Patch CVE‑2022‑2390 and enforce RBAC for deployment APIs."
        }
      ]
    },
    {
      "issue": "kubernetes_cluster_deployment_api_expose_sensitive_information",
      "kev_id": "kubernetes_deployment_secure_configuration",
      "mitigations": [
        {
          "cve": "CVE-2022-2398",
          "recommendation": "Restrict deployment APIs to authenticated users and apply patch for CVE‑2022‑2398."
        }
      ]
    }
  ]
}
```
