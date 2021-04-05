const { spawn } = require('child_process');
const pngitxt = require('png-itxt');
const fs = require('fs');
const { v4: uuidv4, } = require('uuid');

module.exports = function(RED) 
{			
  function removeAllComments(jpegData)
  {
    for (i = 0; i < jpegData.length - 3; i++)
    {
      if (jpegData[i] == 0xFF && jpegData[i + 1] == 0xFE)
      {
        var len = (jpegData[i + 2] << 8 | jpegData[i + 3]);
        jpegData.splice(i, 2 + len);
        i--;
      }
    }
    return jpegData;
  }

  function findJFIFEnd(jpegData)
  {
    // find end of JFIF tag
    for (i = 0; i < jpegData.length - 1; i++)
      if (jpegData[i] == 0xFF && jpegData[i + 1] == 0xE0)
        return (i + 18);
  }

  function addCommentAt(jpegData, comment, pos)
  {
    if (typeof comment === "undefined" || comment.length == 0)
      return jpegData;
    // add comment
    var pre = jpegData.slice(0, pos);
    var post = jpegData.slice(pos, jpegData.length);
    var com = [0xFF, 0xFE];
    var len = comment.length;
    com.push(((len + 2) >> 8) & 0xFF);
    com.push((len + 2) & 0xFF);
    for (i = 0; i < len; i++)
			com.push(comment.charCodeAt(i));

    jpegData = pre.concat(com).concat(post);
    return jpegData;
  }

  function ThreemaSendFileNode(config) 
  {
		RED.nodes.createNode(this, config);

		// keep the node global to use within the callback
    var node = this;
		node.status({fill:"yellow",shape:"dot",text:"send-file.status.init"});
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

    this.sendOption = config.sendOption;		
    this.comment = config.comment;
    this.thumb = config.thumb;
    this.file = config.file;

		node.status({fill:"green",shape:"dot",text:"send-file.status.ready"});

    node.on('input', function(msg, send, done) 
    {
      // keep the message to use in callback
      var myMsg = {};
      
      if (typeof msg.comment === "string")
        node.comment = msg.comment;
      if (typeof msg.thumb === "string")
        node.thumb = msg.thumb;
      if (typeof msg.file === "string")
        node.file = msg.file;

      if (node.thumb === "string" && node.thumb.length != 0 && !fs.existsSync(node.thumb))
      {
        this.status({fill:"red",shape:"dot",text:"send-file.status.error"});
        var str = "The file '" + node.thumb + "' is not available. Correct the path or remove it.";
        node.warn(str);
        myMsg.error = str;
        node.send(myMsg);
        return;
      }
      if (node.file === "undefined" || node.file.length == 0 || !fs.existsSync(node.file))
      {
        this.status({fill:"red",shape:"dot",text:"send-file.status.error"});
        var str = "The file '" + node.file + "' is not available. The file is mandatory.";
        node.warn(str);
        myMsg.error = str;
        node.send(myMsg);
        return;
      }

			this.status({fill:"blue",shape:"dot",text:"send-file.status.encrypting"});
					
      // Python: threema-gateway send_image <to> <from> <secret> <privateKey> <imageFile>
      // Python: threema-gateway send_file <to> <from> <secret> <privateKey> <file> -t <thumbnailFile>
      // PHP: threema-msgapi-tool.php -S -i <threemaId> <from> <secret> <privateKey> <imageFile>
      // PHP: threema-msgapi-tool.php -S -f <threemaId> <from> <secret> <privateKey> <file> <thumbnailFile>
      var threema;
      var tmpFile;
      var ext = node.file.split(".").pop();

      if (node.sendOption === "image" &&
          (ext.localeCompare('jpg', undefined, { sensitivity: 'accent' })  == 0 || 
           ext.localeCompare('jpeg', undefined, { sensitivity: 'accent' }) == 0 ||
           ext.localeCompare('png', undefined, { sensitivity: 'accent' })  == 0)) 
      {
        if (ext.localeCompare('png', undefined, { sensitivity: 'accent' })  == 0)
        {
          // PNG image
          tmpFile = uuidv4() + ".png";
          fs.createReadStream(node.file)
            .pipe(pngitxt.set( { keyword: 'Comment', value: node.comment } ))
            .pipe(fs.createWriteStream(tmpFile));
          node.file = tmpFile;
        }
        else
        {
          // JPG image
          var jpegDataBuffer = fs.readFileSync(node.file);
          var jpegData = [...jpegDataBuffer];
          jpegData = removeAllComments(jpegData);
          var i = findJFIFEnd(jpegData);
          jpegData = addCommentAt(jpegData, node.comment, i);

          tmpFile = uuidv4() + ".jpg";
          fs.writeFileSync(tmpFile, Buffer.from(jpegData));
          node.file = tmpFile;
        }
        threema = spawn(node.executable, 
          ['send_image', node.recipientId, node.senderId, node.secret, node.private_key, node.file]);
      }
      else
      {
        var param;
        if (fs.existsSync(node.thumb) &&
            (ext.localeCompare('jpg', undefined, { sensitivity: 'accent' })  == 0 || 
             ext.localeCompare('jpeg', undefined, { sensitivity: 'accent' }) == 0 ||
             ext.localeCompare('png', undefined, { sensitivity: 'accent' })  == 0))
          param = ["-t", node.thumb];
        else
          param = [];
        threema = spawn(node.executable, 
          ['send_file', node.recipientId, node.senderId, node.secret, node.private_key, node.file, ...param]);
      }
			
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
        if (typeof tmpFile !== "undefined")
          fs.unlinkSync(tmpFile);
				node.status({fill:"green",shape:"dot",text:"send-file.status.ready"});
				node.send(myMsg);
			});

			threema.on('error', (err) =>
			{
				myMsg.error = err.toString();
				node.status({fill:"red",shape:"dot",text:"send-file.status.error"});
				node.error(myMsg.error);
			});
			
			if (done) 
				done();
    });
        
    this.on('close', function() {
			// tidy up any state
		});
  }
  RED.nodes.registerType("send-file", ThreemaSendFileNode);
}
 
