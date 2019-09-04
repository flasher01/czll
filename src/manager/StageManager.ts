/*
* name;
*/
class StageManager {

    public uiParent: Laya.Sprite;
    public playerParent: Laya.Sprite;

    private static _instance: StageManager;

    static GetInstance() {
        if (this._instance == null) {
            this._instance = new StageManager();
        }
        return this._instance;
    }

    init() {

        this.uiParent = new Laya.Sprite();
        this.playerParent = new Laya.Sprite();
        this.playerParent.name = "PlayerNode";

        Laya.stage.addChild(this.uiParent);
        //默认0会被Scene场景遮挡
        this.uiParent.zOrder = ZOrderDefine.UI;

        Laya.stage.addChild(this.playerParent);
        this.playerParent.pos(0, 0)
        this.playerParent.zOrder = ZOrderDefine.PLAYER;

    }
}