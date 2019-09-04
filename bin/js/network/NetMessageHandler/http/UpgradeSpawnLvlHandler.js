var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UpgradeSpawnLvlHandler = (function (_super) {
    __extends(UpgradeSpawnLvlHandler, _super);
    function UpgradeSpawnLvlHandler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UpgradeSpawnLvlHandler.prototype.BaseMsgHandler = function (data) {
        var message = com.msg.s_UpgradeSpawnLvl_2013.decode(data);
        Log.Debug("获取信息 s_UpgradeSpawnLvl_2013:%o", message);
        //升级产能
        //保存
        if (message.result == 1) {
            //成功
            GameDataManager.getInstance().LoginPlayerInfo.SpawnLvl = message.newLvl;
            // GameDataManager.getInstance().LoginPlayerInfo.CoinSpawnLvl = message.goldSpawnLvl;
            // GameDataManager.getInstance().LoginPlayerInfo.DiamondSpawnLvl = message.diamondSpawnLvl;
            Facade.instance.sendNotification(NotificationNames.UpgradeUI_RefreshSpawnInfo, message.result);
            //本地保存金币数量
            GameDataManager.getInstance().LoginPlayerInfo.MoneyInfo.goldNum = message.totalGold;
            //通知刷新
            Facade.instance.sendNotification(NotificationNames.UI_RefreshMoneyInfo);
        }
        else {
            //失败
            Log.Error("产能升级失败");
        }
    };
    return UpgradeSpawnLvlHandler;
}(BaseMsgHandler));
//# sourceMappingURL=UpgradeSpawnLvlHandler.js.map