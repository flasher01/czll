/*
* Layasocket的封装
*/
class WsConnection {
    private ProtoBuf: any = Laya.Browser.window.protobuf;

    private socket: Laya.Socket;
    private sendBytes: Laya.Byte;
    private recivBytes: Laya.Byte;

    //外部消息监听
    private onOpenListener: Function;
    private onCloseListener: Function;
    private onErrorListener: Function;
    private onMessageListener: Function;

    //socket连接地址
    private wsAddress: string;

    constructor() {
    }

    /**
     * 初始化socket
     * @param wsAddresss socket连接地址
     */
    public Init(wsAddresss: string) {
        this.wsAddress = wsAddresss;
        this.socket = new Laya.Socket();

        this.recivBytes = new Laya.Byte();
        this.sendBytes = new Laya.Byte();
        this.sendBytes.endian = Laya.Byte.BIG_ENDIAN;
        this.recivBytes.endian = Laya.Byte.BIG_ENDIAN;

        this.socket.on(Laya.Event.OPEN, this, this.openStaticHandler);
        this.socket.on(Laya.Event.MESSAGE, this, this.receiveStaticHandler);
        this.socket.on(Laya.Event.CLOSE, this, this.closeHandler);
        this.socket.on(Laya.Event.ERROR, this, this.errorHandler);
    }

    /**
     * 添加外部事件监听
     * @param onOpen 连接成功回调
     * @param onClose 连接关闭回调
     * @param onMessage 收到消息回调
     * @param onError 连接失败回调
     */
    public AddEventListener(onOpen?: Function, onClose?: Function, onMessage?: Function, onError?: Function) {
        if (onOpen) this.onOpenListener = onOpen;
        if (onClose) this.onCloseListener = onClose;
        if (onMessage) this.onMessageListener = onMessage;
        if (onError) this.onErrorListener = onError;
    }

    /**
     * socket发起连接
     */
    public Connect() {
        this.socket.connectByUrl(this.wsAddress);//建立连接；
    }

    /**
     * 发送二进制消息
     * @param msgID 消息id
     * @param byteBuffer 二进制数据内容 
     */
    public SendMsg(msgID: number, byteBuffer: Uint8Array) {
        this.sendBytes.clear();

        this.sendBytes.writeUint32(msgID);
        this.sendBytes.writeArrayBuffer(byteBuffer);
        this.socket.send(this.sendBytes.buffer);
    }
    
    /**
     * 关闭连接
     */
    public Close() {
        if (!this.socket) return;
        this.socket.off(Laya.Event.OPEN, this, this.openStaticHandler);//openHandler);
        this.socket.off(Laya.Event.MESSAGE, this, this.receiveStaticHandler);//
        this.socket.off(Laya.Event.CLOSE, this, this.closeHandler);
        this.socket.off(Laya.Event.ERROR, this, this.errorHandler);

        this.wsAddress = null;
        this.socket.cleanSocket()
        this.socket.close();
        this.recivBytes.clear();
        this.sendBytes.clear();
        this.recivBytes = null;
        this.sendBytes = null;

        this.onOpenListener = null;
        this.onCloseListener = null;
        this.onMessageListener = null;
        this.onErrorListener = null;
        this.socket = null
    }


    /**
     * 连接成功回调
     */
    private openStaticHandler(): void {
        //正确建立连接；
        Log.Debug("socket连接成功");
        if (this.onOpenListener) this.onOpenListener()
    }

    /**
     * 收到消息回调, 收到的消息 前4Byte为ID, 后部为proto二进制
     * @param msg 
     */
    private receiveStaticHandler(msg: any): void {
        if (msg instanceof ArrayBuffer) {
            this.recivBytes.clear();
            this.recivBytes.writeArrayBuffer(msg);
            this.recivBytes.pos = 0;

            var mainId: number = this.recivBytes.getInt32();
            let len: number = this.recivBytes.length - 4;
            let mbuffer: Uint8Array = this.recivBytes.getUint8Array(this.recivBytes.pos, len)
            if (this.onMessageListener) this.onMessageListener(mainId, mbuffer)
        } else {
            //  if (typeof msg == "string")
            Log.Debug("接收网络失败：" + msg);
            if (this.onErrorListener) this.onErrorListener(msg)
        }
    }

    /**
     * 服务器关闭连接回调
     * @param e 
     */
    private closeHandler(e): void {
        //关闭事件
        Log.Debug("websocket connection close, type:" + e.type + ", code:" + e.code + ", reason:" + e.reason);
        if (this.onCloseListener) this.onCloseListener();
    }

    /**
     * 连接失败回调
     * @param e 
     */
    private errorHandler(e: Laya.Event): void {
        //连接出错
        Log.Debug("Link失败：" + e.type);
        if (this.onErrorListener) this.onErrorListener(e.type)
    }
}