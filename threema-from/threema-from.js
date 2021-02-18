module.exports = function(RED) {
    function ThreemaFromNode(n) {
        RED.nodes.createNode(this,n);
        this.threema_id = n.threema_id;
        this.name = n.name;
        this.private_key = n.private_key;
        this.secret = n.secret;
        this.executable = n.executable;
        this.persistentKeyStore = n.persistentKeyStore;
        this.keyStoreName = n.keyStoreName;
    }
    RED.nodes.registerType("threema-from", ThreemaFromNode);
}
