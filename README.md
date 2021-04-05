# ThreemaNode
Nodes to use Threema from Node-Red. The following features are currently available:

 * Get the current amount of available credits
 * Send a message via the gateway
 * Decrypt a message from the gateway
 * Send files via the gateway
 
The node requires the Threema SDK (https://gateway.threema.ch/en/developer/sdk-python) to be installed as well as a gateway account (https://gateway.threema.ch/en). 

Only e2e encryption/decryption is supported! It is required to use the Python SDK.

For detailed description, see the documentation of the individual nodes and the provided examples. 

## Nodes
### send-message
Send a message from a given account to a given recipient. The input message is not evaluated unless mustache tags are used. The output is a copy of the input message. 
### send file
Send a file from a given account to a given recipient. The file can either be an image, which is jpeg or png, or any other file typ ewhich is sent as generic file. Files can have an optional thumbnail image. Images can have comments. For jpeg images, the comment is written to the comment tag in the image and also displayed in the message. For png images the comment is only written to the image but not displayed. 
### get-credits
Returns the current amount of credits. 
### decryptor
Decrypts a message which was sent to the gateway and forwarded as HTTPS POST request.
 
## Config nodes
### threema-from
Provides the configuration per gateway account including the binary of the SDK.
### threema-to
Provides a list of recipients to be selected for the send-message node.
