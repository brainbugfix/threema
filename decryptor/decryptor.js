const { spawn, spawnSync } = require('child_process');

module.exports = function(RED) 
{			
  function ThreemaDecryptorNode(config) 
  {
    RED.nodes.createNode(this, config);

    // keep the node global to use within the callback
    var node = this;
		node.status({fill:"yellow",shape:"dot",text:"decryptor.status.init"});
    // Retrieve the config node
		this.from = RED.nodes.getNode(config.senderId);
		if (this.from) 
		{
			this.senderId = this.from.threema_id;
			this.secret = this.from.secret;
			this.private_key = this.from.private_key;
      this.executable = this.from.executable;
      this.persistentKeyStore = this.from.persistentKeyStore;
      this.keyStoreName = this.from.keyStoreName;
		}
		else 
		{
			this.senderId = null;
			this.secret = null;
			this.private_key = null;
      this.executable = null;
      this.persistentKeyStore = false;
      this.keyStoreName = null;
    }
    
    var myMsg = {};
    
    node.status({fill:"green",shape:"dot",text:"decryptor.status.ready"});

    node.on('input', function(msg, send, done) 
    {
      this.status({fill:"blue",shape:"dot",text:"decryptor.status.decrypting"});

      myMsg.from = msg.payload.from;
      myMsg.to = msg.payload.to;
      myMsg.nickname = msg.payload.nickname;
      myMsg.date = msg.payload.date;

      // FIXME: select if persistent store with name or not
      var pubKeys;
      if (this.persistentKeyStore === false)
        pubKeys = this.context().global.get("pubKeys");
      else
        pubKeys = this.context().global.get("pubKeys", this.keyStoreName);
      if (typeof pubKeys === 'undefined')
        pubKeys = new Map();
      else
        pubKeys = new Map(Object.entries(pubKeys));

      var publicKey;

      if (pubKeys.has(msg.payload.from))
      {
        publicKey = pubKeys.get(msg.payload.from);
      }
      else
      {
        // Python: threema-gateway lookup <from> <secret> -i <id>
        // PHP: threema-msgapi-tool.php -l -k <threemaId> <from> <secret>
        var pubKeyOut = spawnSync(node.executable,
          ['lookup', node.senderId, node.secret, '-i', msg.payload.from]);
        publicKey = String(pubKeyOut.stdout).trim();
        pubKeys.set(msg.payload.from, publicKey);
        if (this.persistentKeyStore === false)
          this.context().global.set('pubKeys', Object.fromEntries(pubKeys));
        else
          this.context().global.set('pubKeys', Object.fromEntries(pubKeys), this.keyStoreName);
      }

      var box = msg.payload.box.trim(); // for some reasons this cannot used directly as parameter

      // Python: threema-gateway decrypt <privateKey> <publicKey> <nonce>
      // 
      // PHP: threema-msgapi-tool.php -D <privateKey> <publicKey> <nonce>
      // Decrypt a box (must be provided on stdin) message and download (if the message is an image or file message) the file(s) to the given <outputFolder> folder
      var threemaMsg = spawn(node.executable, 
				['decrypt', node.private_key, publicKey, msg.payload.nonce]);
      
      threemaMsg.stdin.write(box);
      threemaMsg.stdin.end();

      threemaMsg.stdout.on('data', (data) =>
      {
        myMsg.message = data.toString().trim();
      });

      threemaMsg.stderr.on('data', (data) =>
      {
        myMsg.error = data.toString();
      });

			threemaMsg.on('close', (code) =>
      {
        myMsg.status = code;
        node.status({fill:"green",shape:"dot",text:"decryptor.status.ready"});
        node.send(myMsg);
      });

			threemaMsg.on('error', (err) =>
      {
        myMsg.error = err.toString();
        node.status({fill:"red",shape:"dot",text:"decryptor.status.error"});
				node.error(myMsg.error);
      });

      if (done) 
				done();
    });
        
    this.on('close', function() {
			// tidy up any state
		});
  }
  RED.nodes.registerType("decryptor", ThreemaDecryptorNode);
}
  