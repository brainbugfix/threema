module.exports = function(RED) {
    function ThreemaToNode(n) {
        RED.nodes.createNode(this,n);
        this.threema_id = n.threema_id;
        this.name = n.name;
    }
    RED.nodes.registerType("threema-to", ThreemaToNode);
}
