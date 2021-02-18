const { spawn } = require('child_process');
let mustache = require("mustache");

module.exports = function(RED) 
{			
  function ThreemaSendMessageNode(config) 
  {
		// Retrieve the config node
		this.from = RED.nodes.getNode(config.senderId);
		if (this.from) 
		{
			this.senderId = this.from.threema_id;
			this.secret = this.from.secret;
			this.private_key = this.from.private_key;
			this.executable = this.from.executable;
		}
		else 
		{
			this.senderId = null;
			this.secret = null;
			this.private_key = null;
			this.executable = null;
		}
		
		this.to = RED.nodes.getNode(config.recipientId);
		if (this.to) 
		{
			this.recipientId = this.to.threema_id;
		}
		else
		{
			this.recipientId = null;
		}
		
		this.message = config.message;		
	
		var myMsg;
		var node;
		
		RED.nodes.createNode(this, config);
		// keep the node global to use within the callback
    node = this;
    node.on('input', function(msg, send, done) 
    {
			// keep the message to use in callback
			myMsg = msg;
			
			// threema-gateway send_e2e <to> <from> <secret> <privateKey>
			// '/home/pi/venv/bin/threema-gateway'
			var threema = spawn(node.executable, 
				['send_e2e', node.recipientId, node.senderId, node.secret, node.private_key]);
				
			threema.stdin.write(mustache.render(node.message, msg));
			threema.stdin.end();
			
			threema.stdout.on('data', (data) =>
			{
				myMsg.msgid = data.toString().trim();
			});

			threema.stderr.on('data', (data) =>
			{
				myMsg.error = data.toString();
			});

			threema.on('close', (code) =>
			{
				myMsg.status = code;
				node.send(myMsg);
			});

			threema.on('error', (err) =>
			{
				myMsg.error = err.toString();
				node.error(myMsg.error);
			});
			
			if (done) 
				done();
    });
        
    this.on('close', function() {
			// tidy up any state
		});
  }
  RED.nodes.registerType("send-message", ThreemaSendMessageNode);
}
 
