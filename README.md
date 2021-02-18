# ThreemaNode
Nodes to use Threema from Node-Red. The following features are currently available:

 * Get the current amount of available credits
 * Send a message via the gateway
 * Decrypt a message from the gateway
 
The node requires the Threema SDK (https://gateway.threema.ch/en/developer/sdk-python) to be installed as well as a gateway account (https://gateway.threema.ch/en). 

Only e2e encryption/decryption is supported! The nodes is tested with the Python SDK but it should also work with the other SDK's as long as they have the same input parameters in the same order.

For detaild description, see the documentation of the individual nodes and the provided examples. 

## Nodes
### send-message
Send a message from a given account to a given recipient. The input message is not evaluated unless mustache tags are used. The output is a copy of the input message. 
### get-credits
Returns the current amount of credits. 
### decryptor
Decrypts a message which was sent to the gateway and forwarded as HTTPS POST request.
 
## Config nodes
### threema-from
Provides the configuration per gateway account including the binary of the SDK.
### threema-to
Provides a list of recipients to be selected for the send-message node.
