var azure = require('azure');
var adal = require('adal-node');

var config = {
  tenant: 'fawadsirajmsn.onmicrosoft.com',
  subscriptionId: 'f0f221d7-6efb-45e4-a876-b6d6a04d85e2',
  clientId: 'f47b4ac5-09d6-4d4b-8dbe-f5a809d946f3',
  clientKey: '7ykc58Nm43VFNFtQ1LwBYJvuRP+VzlOd6Zd9BeW/acM=',
};

function getToken (callback){
  // instantiate AD AuthContext with directory endpoint
  var authContext = new adal.AuthenticationContext('https://login.windows.net/' + config.tenant);

  // get client access token from active directory
  authContext.acquireTokenWithClientCredentials(
    'https://management.core.windows.net/',
    config.clientId,
    config.clientKey,
    callback);
}

function tokenCallback(error, tokenResponse){
  if (error)
    return console.error('Token Error: ', error);

  // azure helper class for passing credentials
  var credentials = new azure.TokenCloudCredentials({
    subscriptionId: config.subscriptionId,
    token: tokenResponse.accessToken
  });

  // pass credentials to resource management client,
  // just as example; this could be any arm service
  var client = azure.createResourceManagementClient(credentials);
  var parameters = {
    properties: {
      template: {
        "$schema": "https://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
        "contentVersion": "1.0.0.0",
        "parameters": {
            "location": {
              "type": "string",
              "allowedValues": ["Central US",
              "East Asia",
              "East US",
              "East US 2",
              "Japan East",
              "Japan West",
              "North Europe",
              "South Central US",
              "Southeast Asia",
              "West Europe",
              "West US"],
              "metadata": {
                "description": "The location where all azure resources will be deployed."
              }
          },
          "clusterType": {
            "type": "string",
            "allowedValues": ["hadoop",
            "spark"],
            "metadata": {
              "description": "The type of the HDInsight cluster to create."
            }
          },
          "clusterName": {
            "type": "string",
            "metadata": {
              "description": "The name of the HDInsight cluster to create."
            }
          },
          "clusterLoginUserName": {
            "type": "string",
            "metadata": {
              "description": "These credentials can be used to submit jobs to the cluster and to log into cluster dashboards."
            }
          },
          "clusterLoginPassword": {
            "type": "securestring",
            "metadata": {
              "description": "The password must be at least 10 characters in length and must contain at least one digit, one non-alphanumeric character, and one upper or lower case letter."
            }
          },
          "sshUserName": {
            "type": "string",
            "metadata": {
              "description": "These credentials can be used to remotely access the cluster."
            }
          },
          "sshPublicKey": {
            "type": "securestring",
            "metadata": {
              "description": "This field must be a valid SSH public key."
            }
          },
          "clusterStorageAccountName": {
            "type": "string",
            "metadata": {
              "description": "The name of the storage account to be created and be used as the cluster's storage."
            }
          },
          "clusterWorkerNodeCount": {
            "type": "int",
            "defaultValue": 4,
            "metadata": {
              "description": "The number of nodes in the HDInsight cluster."
            }
          }
        },
        "variables": {
          "defaultApiVersion": "2015-05-01-preview",
          "clusterApiVersion": "2015-03-01-preview"
        },
        "resources": [{
          "name": "[concat(parameters('clusterName'),'/R-Server')]",
          "type": "Microsoft.HDInsight/clusters/applications",
          "apiVersion": "[variables('clusterApiVersion')]",
          "dependsOn": ["[concat('Microsoft.HDInsight/clusters/',parameters('clusterName'))]"],
          "properties": {
            "marketPlaceIdentifier": "Microsoft.RServerForHDInsight.8.0.3",
            "computeProfile": {
              "roles": [{
                "name": "edgenode",
                "targetInstanceCount": 1,
                "hardwareProfile": {
                  "vmSize": "Standard_D4_v2"
                }
              }]
            },
            "installScriptActions": [],
            "uninstallScriptActions": [],
            "httpsEndpoints": [],
            "applicationType": "RServer"
          }
        },
        {
          "name": "[parameters('clusterStorageAccountName')]",
          "type": "Microsoft.Storage/storageAccounts",
          "location": "[parameters('location')]",
          "apiVersion": "[variables('defaultApiVersion')]",
          "dependsOn": [],
          "tags": {
            
          },
          "properties": {
            "accountType": "Standard_LRS"
          }
        },
        {
          "name": "[parameters('clusterName')]",
          "type": "Microsoft.HDInsight/clusters",
          "location": "[parameters('location')]",
          "apiVersion": "[variables('clusterApiVersion')]",
          "dependsOn": ["[concat('Microsoft.Storage/storageAccounts/',parameters('clusterStorageAccountName'))]"],
          "tags": {
            
          },
          "properties": {
            "clusterVersion": "3.4",
            "osType": "Linux",
            "tier": "Premium",
            "clusterDefinition": {
              "kind": "[parameters('clusterType')]",
              "configurations": {
                "gateway": {
                  "restAuthCredential.isEnabled": true,
                  "restAuthCredential.username": "[parameters('clusterLoginUserName')]",
                  "restAuthCredential.password": "[parameters('clusterLoginPassword')]"
                }
              }
            },
            "storageProfile": {
              "storageaccounts": [{
                "name": "[concat(parameters('clusterStorageAccountName'),'.blob.core.windows.net')]",
                "isDefault": true,
                "container": "[parameters('clusterName')]",
                "key": "[listKeys(resourceId('Microsoft.Storage/storageAccounts', parameters('clusterStorageAccountName')), variables('defaultApiVersion')).key1]"
              }]
            },
            "computeProfile": {
              "roles": [{
                "name": "headnode",
                "targetInstanceCount": "2",
                "hardwareProfile": {
                  "vmSize": "Standard_D3_v2"
                },
                "osProfile": {
                  "linuxOperatingSystemProfile": {
                    "username": "[parameters('sshUserName')]",
                    "sshProfile": {
                      "publicKeys": [{
                        "certificateData": "[parameters('sshPublicKey')]"
                      }]
                    }
                  }
                }
              },
              {
                "name": "workernode",
                "targetInstanceCount": "[parameters('clusterWorkerNodeCount')]",
                "hardwareProfile": {
                  "vmSize": "Standard_D3_v2"
                },
                "osProfile": {
                  "linuxOperatingSystemProfile": {
                    "username": "[parameters('sshUserName')]",
                    "sshProfile": {
                      "publicKeys": [{
                        "certificateData": "[parameters('sshPublicKey')]"
                      }]
                    }
                  }
                }
              }]
              }
            }
          }
        ]
      },
      parameters: {
        
            "location": {
                "value": "West US"
            },
            "clusterName": {
                "value": "stackarmor"
            },
            "clusterType": {
                "value": "hadoop"
            },
            "clusterStorageAccountName": {
                "value": "stackarmor"
            },
            "clusterLoginUserName": {
                "value": "admin"
            },
            "clusterLoginPassword": {
                "value": "Spring2015!"
            },
            "sshUserName": {
                "value": "hdiuser"
            },
            "sshPublicKey": {
                "value": "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDaWcUL+lq0+pky1+KhY9W05Xo1TN5wu64WsFNH0+S1Na12dWr7KUwHAefuUksZimyfrhGb/KkpfrZ39leqMf1B76yhfE/UJDF+YfEcEl9NQRSVr8P7njaz1BaCLx+csTSl5R9f9MBInQJhW5d1ixDeD7IeCLHrBTsUkf0lutJKYJLGk3iUmv8Afs5db/bXDH83VAr1XRXPwOnoBNpruk11p8b+8+iAvMd+p/TMFzOEXnksKYO6wl2b7uOMTz80EpHFltAOtVTTqIMpiqrVvOvhSP+uNgoLm83aFKL2MDFh2P5vvNDQQDSmxOiQkkn0F7Bwp46qcWgVDVX41Jp/Ibxt fsiraj@FRS-Pro.local"
            }
        
          
      },
      mode: "Incremental"
    }
    //parametersLink: 'https://github.com/Azure/azure-quickstart-templates/blob/master/101-vnet-two-subnets/azuredeploy.parameters.json'
  };
  //client.resourceGroups.list(listCallback);
  client.deployments.createOrUpdate('azureduh','work', parameters,listCallback);
}

function listCallback(error, result){
  if (error)
    return console.error('List Error: ', error);

  console.log("List Success: " + JSON.stringify(result));
}

getToken(tokenCallback);