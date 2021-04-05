const { spawn } = require('child_process');

module.exports = function(RED) 
{			
  function ThreemaGetCreditsNode(config) 
  {
		RED.nodes.createNode(this, config);
		
		var node = this;
		// Retrieve the config node
		this.from = RED.nodes.getNode(config.senderId);
		if (this.from) 
		{
			this.senderId = this.from.threema_id;
			this.secret = this.from.secret;
			this.executable = this.from.executable;
		}
		else 
		{
			this.senderId = null;
			this.secret = null;
			this.executable = null;
		}

		var myMsg;
		
		function cb_stdout(data)
		{
			myMsg['credits'] = parseInt(data.toString().trim());
		}
		
		function cb_stderr(data)
		{
			myMsg['error'] = data.toString();
		}
		
		function cb_close(code)
		{
			myMsg['status'] = code;
			node.send(myMsg);
		}

		function cb_error(err)
		{
			myMsg['error'] = err.toString();
		}
		
    node.on('input', function(msg, send, done) 
    {
			myMsg = msg;

			// Python: threema-gateway credits <from> <secret>
			// PHP: threema-msgapi-tool.php -C <from> <secret>
			var threema = spawn(node.executable, ['credits', node.senderId, node.secret]);
				
			threema.stdout.on('data', cb_stdout);
			threema.stderr.on('data', cb_stderr);
			threema.on('close', cb_close);
			threema.on('error', cb_error);
			
			if (done) 
				done();
    });
        
        this.on('close', function() {
			// tidy up any state
		});
	}
    RED.nodes.registerType("get-credits", ThreemaGetCreditsNode);
}
 
