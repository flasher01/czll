/*
* 资源管理
*/
class ResourceManager {
    private static _instance: ResourceManager = null;

    public static GetInstance(): ResourceManager {
        if (this._instance == null) {
            this._instance = new ResourceManager();
        }
        return this._instance;
    }

    constructor() {
        Laya.loader.on(laya.events.Event.ERROR, this, this.onError)
    }

    onError(msg) {
        Log.Error("load error:" + msg)
    }

    /**
     * 加载2d资源类型
     * @param url 资源路径 
     * @param comFun 成功回调 LoadTaskCallbackParam{isok:true,  param:loadedcontent}  类型作为参数
     */
    loadRes(url: any, comFun: Function, type?: any) {
        let formatURL = CommonUtil.ConverUrlObject(CommonUtil.FormatURL(url));
        //取消卸载
        if (this.unloadingMap.get(formatURL)) {
            Log.Debug("加载资源, 取消卸载" + formatURL)
            this.recordUnloaded(formatURL);
        }

        // if (this.loadingMap.get(formatURL)) {
        //     Log.Warn("正在加载2d资源, 不进行重复加载" + formatURL)
        //     if (comFun) comFun()
        // } else 
        {
            let resExist = this.checkResLoaded(formatURL);
            if (resExist) {
                Log.Debug("资源已经2d加载, 立刻返回 " + formatURL)
                if (comFun) comFun(new LoadTaskCallbackParam(true, this.getRes(formatURL)))
            } else {
                //记录正在加载和没加载的
                let loadTask = this.createLoadingTask(formatURL, formatURL, comFun, null);
                let needLoad = this.recordTask(loadTask)
                if (!needLoad) return;
                Laya.loader.load(formatURL, Handler.create(this, this.onloaded, [formatURL, comFun, null, loadTask]), null, type);
            }
        }
    }
    /**
     * 加载2d二进制文件
     * @param url 资源路径 
     * @param comFun 成功回调 LoadTaskCallbackParam{isok:true,  param:loadedcontent}  类型作为参数
     */
    loadBytesFile(url: any, comFun: Function) {
        this.loadRes(url, comFun, Laya.Loader.BUFFER);
    }

    /**
     * 2d资源加载成功回调
     * @param url 成功的资源路径
     * @param comFun 成功回调
     * @param loadeContent 成功加载内容 
     */
    private onloaded(url: any, comFun: Function, failFun: Function, task: LoadingTask, loadeContent: any) {
        //Log.Debug("=====>res loaded: " + url)
        // this.recordLoading(url, false)
        // let success = this.checkLoadedSuccess([url]);
        // if (!success) {
        //     if (failFun) failFun();
        //     return;
        // }

        //检测当前的task的资源都完成加载, 没有继续等待,
        let commpleted = this.checkAllTaskComplete(task.TaskID)
        if (commpleted) {
            this.executeCallbackAndClearTask(task.TaskID, loadeContent)
        }
        // this.checkAllTaskComplete(task.TaskID, success, loadeContent)
        // comFun(loadeContent);
    }

    /**
     * 批量加载2d资源
     * @param urls 资源路径 
     * @param comFun 成功回调 LoadTaskCallbackParam{isok:true,  param:urllist}  类型作为参数
     */
    loadResArray(urls: any[], comFun: Function, type?: any, onProgress?: Function) {
        //urls = CommonUtil.RemoveRepeated(urls);
        let urlcopy = CommonUtil.FormatURLArray(urls)
        let urllist = []
        for (let index = 0; index < urlcopy.length; index++) {
            let tempUrl = CommonUtil.ConverUrlObject(urlcopy[index]);
            //取消卸载
            if (this.unloadingMap.get(tempUrl)) {
                Log.Debug("加载资源, 取消卸载" + tempUrl)
                this.recordUnloaded(tempUrl);
            }

            // if (this.loadingMap.get(tempUrl)) {
            //     Log.Warn("正在加载2d资源, 不进行重复加载" + tempUrl)
            // } else 

            {
                let resExist = this.checkResLoaded(tempUrl);
                if (resExist) {
                    Log.Warn("资源已经2d加载, 不需要重复加载 " + tempUrl)
                } else {
                    if (urllist.indexOf(tempUrl) < 0) urllist.push(tempUrl) //不添加重复
                    // this.recordLoading(tempUrl, true)
                }
            }
        }

        if (urllist.length == 0) {
            Log.Debug("没有需要加载的2d资源")
            if (comFun) comFun(new LoadTaskCallbackParam(true, urls))
            return;
        }

        //只需要加载没在加载中的url,在记录加载任务前检测, 否则没加载的会加入loadingmap中
        let notLoadingUrlList = this.getNotLoadingUrl(urllist)
        //记录加载任务, 如果都在加载中, 不需要加载.
        let loadTask = this.createLoadingTask(urllist, urlcopy, comFun, null);
        let needLoad = this.recordTask(loadTask)
        if (!needLoad) return;

        // let url = CommonUtil.FormatURLArray(urls);
        // for (let index = 0; index < urllist.length; index++) {
        //     this.recordLoading(urllist[index], true)
        // }
        if (notLoadingUrlList.length == 0) Log.Error("没有需要加载的2d资源, 但是通过了this.recordTask的检测.")

        Laya.loader.load(notLoadingUrlList,
            Handler.create(this, this.onArrayloaded, [urllist, comFun, null, loadTask, onProgress]),
            onProgress ? Handler.create(this, onProgress) : null,
            type);
    }

    /**
     * 2d资源批量加载成功回调
     * @param url 加载成功的路径Object, url是object[]类型不是string[] 
     * @param comFun 成功回调
     */
    private onArrayloaded(urlList: any[], comFun: Function, failFun: Function, task: LoadingTask, onProgress: Function) {
        // Log.Debug("=====>res loaded array: " + url.length + " " + url)
        // for (var index = 0; index < url.length; index++) {
        //     var element = url[index];
        //     Log.Debug("=========>loaded: " + element.url ? element.url : element);
        // }
        // for (let index = 0; index < urlList.length; index++) {
        //     this.recordLoading(urlList[index], false)
        // }

        // let success = this.checkLoadedSuccess(url);
        // if (!success) {
        //     if (failFun) failFun();
        //     return;
        // }
        // this.checkAllTaskComplete(task.TaskID, success)
        // comFun(url);

        if (onProgress) onProgress(1)
        //检测当前的task的资源都完成加载, 没有继续等待,
        let commpleted = this.checkAllTaskComplete(task.TaskID)
        if (commpleted) {
            this.executeCallbackAndClearTask(task.TaskID)
        }
    }

    /**
     * 加载3d模型贴图, 2dtexture使用loadRes
     * @param url 贴图路径
     * @param comFun 成功回调
     */
    createTextureArray(url: any[], comFun: Function) {
        this.createResArray(url, comFun, Laya.Texture2D)
    }

    /**
     * 批量3d资源加载, lh模型, 贴图, 天空盒
     * @param url 资源路径
     * @param comFun 成功回调 LoadTaskCallbackParam{isok:true,  param:urllist} 类型作为参数
     * @param clas 资源类型 Laya.Texture2D
     * @param progressFun 加载进度
     */
    createResArray(url: any[], comFun: Function, clas?: any, progressFun?: Function) {
        Log.Debug("开始加载资源 " + url[0])
        let urlcopy = CommonUtil.FormatURLArray(url)
        let urllist = []
        try {
            //url在回调onArrayCreated中被修改成Object对象{url, progress} 不再是string类型
            // let urlcopy = [];
            // for (var index = 0; index < url.length; index++) {
            //     var element = url[index];
            //     urlcopy.push(element)
            // }
            for (let index = 0; index < urlcopy.length; index++) {
                let tempUrl = urlcopy[index];
                //取消卸载
                if (this.unloadingMap.get(tempUrl)) {
                    Log.Debug("加载资源, 取消卸载" + tempUrl)
                    this.recordUnloaded(tempUrl);
                }


                // if (this.loadingMap.get(tempUrl)) {
                //     Log.Warn("正在加载资源, 不进行重复加载" + tempUrl)
                // } else 
                {
                    let resExist = this.checkResLoaded(tempUrl);
                    if (resExist) {
                        Log.Warn("资源已经加载, 不需要重复加载 " + tempUrl)
                    } else {
                        urllist.push(tempUrl)
                        // this.recordLoading(tempUrl, true)
                    }
                }

            }

            if (urllist.length == 0) {
                Log.Debug("没有需要加载的资源")
                if (comFun) comFun(new LoadTaskCallbackParam(true, url))
                return;
            }



            //只需要加载没在加载中的url,在记录加载任务前检测, 否则没加载的会加入loadingmap中
            let notLoadingUrlList = this.getNotLoadingUrl(urllist)
            //记录正在加载和没加载的
            let loadTask = this.createLoadingTask(urllist, urlcopy, comFun, null);
            let needLoad = this.recordTask(loadTask)
            if (!needLoad) return;
            // let urlcopy = CommonUtil.FormatURLArray(urllist)

            if (notLoadingUrlList.length == 0) Log.Error("没有需要加载的资源, 但是通过了this.recordTask的检测.")

            //加载没加载中的资源,最后检测批量是否成功使用urllist,
            Laya.loader.create(notLoadingUrlList,
                Handler.create(
                    this,
                    this.onArrayCreated, [urllist, comFun, null, loadTask.TaskID]),
                progressFun ? Handler.create(null, progressFun) : null,
                clas,
                null);
        } catch (error) {
            for (let index = 0; index < urllist.length; index++) {
                let element = urllist[index];
                Log.Debug("加载报错 " + (element.url ? element.url : element))
            }
            Log.Error("createResArray catch error:" + error + " ")
        }
    }

    /**
     * 3d资源批量加载成功
     * @param urlobj 加载成功的路径Object, url是object[]类型不是string[] 
     * @param comFun 成功回调
     */
    private onArrayCreated(urlobj: any[], comFun: Function, failFun: Function, taskid: number) {
        // Log.Debug("=====>res loaded array: " + urlobj.length + " " + urlobj)
        // for (var index = 0; index < urlobj.length; index++) {
        //     var element = urlobj[index];
        //     Log.Debug("=========>loaded: " + element.url ? element.url : element);
        // }
        Log.Debug("3d资源加载成功 taskid:" + taskid + " url[0]:" + urlobj[0].url)
        // for (let index = 0; index < urlobj.length; index++) {
        //     this.recordLoading(urlobj[index], false)
        // }

        //检测当前的task的资源都完成加载, 没有继续等待,
        let commpleted = this.checkAllTaskComplete(taskid)
        if (commpleted) {
            // let success = this.checkLoadedSuccess(urlobj);
            // if (!success) {
            //     if (failFun) failFun();
            //     return;
            // }
            // if (!success) this.checkAllTaskComplete(taskid, success)
            //不管成功/失败. 选出加载的成功的资源, 记录他们的依赖资源加载情况.
            let completedTask = this.taskMap.get(taskid) as LoadingTask;
            let loadedUrlObj = this.getLoadedArray(completedTask.LoadingUrlArray)
            this.recordLoadedDependencies(loadedUrlObj, () => {
                // comFun(urlobj);
                // this.checkAllTaskComplete(taskid, success)
                //都完成了, 检测task的所有资源是否都加载成功,  根据成功情况进行回调. 
                this.executeCallbackAndClearTask(taskid)
            })
        }
        //


    }

    /**
     * 检测资源是否加载成功
     * @param urlobj 资源路径
     */
    private checkLoadedSuccess(urlobj: any[]): boolean {
        let failUrl = []
        for (let index = 0; index < urlobj.length; index++) {
            let urlTemp = urlobj[index];
            let exist = this.checkResLoaded(urlTemp)
            if (!exist) {
                failUrl.push(urlTemp)
            }
        }
        if (failUrl.length > 0) {
            Log.Warn("资源加载失败, 数量:" + failUrl.length)
            for (let index = 0; index < failUrl.length; index++) {
                let element = failUrl[index];
                Log.Warn("加载失败资源:" + (element.url ? element.url : element))
            }
            return false;
        }
        return true;
    }
    //获取其中已经加载的url
    private getLoadedArray(urlobj: any[]): any[] {
        let loadedUrl = []
        for (let index = 0; index < urlobj.length; index++) {
            let urlTemp = urlobj[index];
            let exist = this.checkResLoaded(urlTemp)
            if (exist) {
                loadedUrl.push(urlTemp)
            }
        }
        return loadedUrl;
    }

    /**
     * 获取加载的资源
     * @param url 获取的资源路径 
     */
    getRes(url: string) {
        let resUrl = CommonUtil.FormatURL(url)
        let obj = Laya.loader.getRes(resUrl)
        if (obj == null) {
            Log.Error("获取资源为空, 没有加载:" + resUrl);
        }
        return obj;
    }

    /**
     * 检测资源是否存在记录, 不一定加载成功,正在加载中或者加载成功的
     * @param url 
     */
    private checkResExist(urlObj: any): boolean {
        let url = urlObj.url ? urlObj.url : urlObj;
        let resUrl = CommonUtil.FormatURL(url)
        let obj = Laya.loader.getRes(resUrl)
        return obj ? true : false;
    }

    /**
     * 检测资源是否已经加载成功
     * @param urlObj 
     */
    public checkResLoaded(urlObj: any): boolean {
        let url = CommonUtil.ConverUrlObject(urlObj)
        let resUrl = CommonUtil.FormatURL(url)
        let obj = Laya.loader.getRes(resUrl)
        if (!obj) return false;

        if (CommonUtil.isObject(obj) && "loaded" in obj) {
            return obj.loaded
        } else {
            return true;
        }
    }

    /**
     * 资源释放(Image,Sprite3d对象, 资源路径)
     * @param resurl 可以传入Image,Sprite3d对象, 或需要释放的资源路径.
     * 传入Image,Sprite3d对象: 销毁对象本身, 同时销毁资源. ps只能卸载是通过Image.texture赋值的方式加载的image
     * 传入资源路径: 只销毁资源, 使用资源的对象需要自己销毁.
     * @param comFun 成功回调
     */
    release(resurl: any, comFun?: Function): void {
        if (!resurl) {
            Log.Debug("卸载的资源为空, 不需要卸载")
            if (comFun) comFun();
            return;
        }

        //获取需要卸载的资源路径
        let relaseUrl = null;
        if (resurl instanceof Laya.Image || resurl instanceof Laya.Sprite) {
            if (resurl && resurl.texture && resurl.texture.url) {
                relaseUrl = resurl.texture.url
            } else {
                if (!resurl.texture) {
                    Log.Error("Image的texture为空, 只能卸载通过 Image.texture = ResourceManger.getRes() 方式加载的Image! 其他的只能手动destory Image后, release(url)")
                    if (comFun) comFun();
                    return;
                }
            }
        } else if (!ConstDefine.USING_2D_ENGINE && resurl instanceof Laya.Sprite3D) {
            if (resurl && resurl.url) {
                relaseUrl = resurl.url;
            }
        } else {
            relaseUrl = resurl;
        }
        //检测资源是否正在加载, 是否已经加载
        let formatedRelaseUrl = CommonUtil.FormatURL(relaseUrl)
        if (this.checkIsLoading(formatedRelaseUrl)) {
            //  if (this.loadingMap.get(formatedRelaseUrl)) {
            Log.Warn("正在加载资源, 不进行卸载" + formatedRelaseUrl)
            if (comFun) comFun();
            return;
        }
        //检测资源是否已经加载
        let resExist = this.checkResLoaded(formatedRelaseUrl);
        if (!resExist) {
            if ((!ConstDefine.USING_2D_ENGINE && resurl instanceof Laya.Sprite3D) || resurl instanceof Laya.Image || resurl instanceof Laya.Sprite) {
                Log.Warn("资源已经卸载, 但是sprite3d模型/Image变量没有设空, 导致重复卸载!!" + formatedRelaseUrl)
            } else {
                Log.Warn("资源没有加载, 不需要卸载" + formatedRelaseUrl)
            }
            if (comFun) comFun();
            return;
        }

        //卸载资源
        if (resurl instanceof Laya.Image) {
            this.releaseImage(resurl, comFun)
        } else if (resurl instanceof Laya.Sprite) {
            this.releaseSprite(resurl, comFun)
        } else if (!ConstDefine.USING_2D_ENGINE && resurl instanceof Laya.Sprite3D) {
            this.releaseSprite3d(resurl, comFun)
        } else {
            let url = CommonUtil.FormatURL(resurl)
            this.recordUnloading(resurl)
            //3d资源会先检测是否有依赖资源
            this.releaseDependency(url, (ok) => {
                if (ok) {
                    Laya.loader.clearRes(url, true);//销毁资源
                    this.loaded3DRes.remove(url) //删除3d资源记录
                    this.recordUnloaded(url) //继续卸载完成
                } else {
                    Log.Debug("卸载中断")
                }

                if (comFun) comFun();
            })
        }
    }

    /**
     * Image资源销毁
     * @param image 需要销毁的Image对象
     * @param comFun 成功回调
     */
    private releaseImage(image: Laya.Image, comFun?: Function): void {
        if (image && image.texture) {
            this.releaseSprite(image, comFun);
            // let url = image.texture.url;
            // if (url) {
            //     this.release(url, () => {
            //         if (comFun) comFun();
            //         image.destroy(true)
            //         image = null;
            //     })
            // } else {
            //     Log.Error("传入的imageTexture的url为空, 无法卸载");
            // }
        } else if (image.skin != "") {//todo 一般是图集中图片, 不卸载图集. 如果是单图, 会需要等GC
            image.destroy(true)
            image = null;
        } else {
            Log.Error("传入的image为空,或者image的texture为空, 同时不包含图集中小图, 无法卸载");
        }
    }

    /**
     * Sprite资源销毁
     * @param image 需要销毁的Sprite对象
     * @param comFun 成功回调
     */
    private releaseSprite(sprite: Laya.Sprite, comFun?: Function): void {
        if (sprite && sprite.texture) {
            let url = sprite.texture.url;
            if (url) {
                this.release(url, () => {
                    if (comFun) comFun();
                    sprite.destroy(true)
                    sprite = null;
                })
            } else {
                Log.Error("传入的Sprite.Texture的url为空, 无法卸载");
            }
        } else {
            Log.Error("传入的Sprite为空,或者image的texture为空, 同时不包含图集中小图, 无法卸载");
        }
    }

    /**
     * 销毁Sprite3d对象
     * @param model 需要销毁的sprite3d对象 
     * @param comFun 成功回调
     */
    private releaseSprite3d(model: Laya.Sprite3D, comFun?: Function): void {
        if (model && model.url) {
            let resurl = model.url;
            let url = CommonUtil.FormatURL(resurl)
            this.release(url, () => {
                //需要在卸载完成后才detorymodel,否则destory先销毁了lh, 导致检测是否已经加载lh出错
                model.destroy(true)
                comFun()
            })

        } else {
            Log.Error("传入的model为空,或者model的url为空 无法卸载");
        }
    }

    /**
     * lh依赖资源的销毁.
     * @param resurl 需要销毁的lh/ls资源路径
     * @param comFun 成功回调
     */
    private releaseDependency(resurl: string, comFun: Function): void {
        let index = resurl.lastIndexOf(".lh");
        if (index < 0) {
            index = resurl.lastIndexOf(".ls");
            if (index < 0) {
                // Log.Debug("资源不是lh/ls 3d资源, 不进行依赖资源卸载. " + resurl)
                comFun(true)
                return;
            }
        }

        Log.Debug("开始卸载依赖资源 " + resurl)
        //把url的lh换成json , 加载json, 卸载json中记录的依赖资源
        let depResJsonUrl = resurl.substring(0, index) + ".json"
        Log.Debug("--卸载依赖资源, 使用依赖资源记录文档-" + depResJsonUrl)
        ResourceManager.GetInstance().loadRes(depResJsonUrl, (param: LoadTaskCallbackParam) => {
            if (param.Ok) {
                let json = param.Param as DependenciesResInfos

                Log.Debug("加载卸载依赖资源json完成 " + resurl)
                if (!this.unloadingMap.get(resurl)) {
                    Log.Debug("资源卸载被取消, 不继续卸载 " + resurl)
                    comFun(false)
                    return;
                }
                for (let index = 0; index < json.denpendenciesList.length; index++) {
                    let dependentResInfo = json.denpendenciesList[index];
                    //转换依赖资源路径,json中记录的路径是相对lh所在目录的路径
                    let lhParentDir = depResJsonUrl.substring(0, depResJsonUrl.lastIndexOf("/"))
                    let depResUrl = lhParentDir + "/" + dependentResInfo.Path;//依赖资源路径

                    //检测资源依赖计数    
                    let refCount = this.loaded3DDeps.get(depResUrl)
                    if (refCount && refCount > 1) {
                        //还有其他依赖, 减一, 不删除
                        refCount -= 1;
                        this.loaded3DDeps.set(depResUrl, refCount);
                    } else {
                        //无其他资源依赖,删除依赖资源 防止共用资源已经提前卸载
                        this.loaded3DDeps.remove(depResUrl);
                        let res = Laya.loader.getRes(depResUrl);
                        if (res)
                            res.dispose();
                        else {
                            Log.Warn(depResJsonUrl + " 资源不存在, 已经卸载," + depResUrl)
                        }
                    }
                }
                Log.Debug("卸载完依赖资源")
                //卸载完 清理依赖资源json
                ResourceManager.GetInstance().release(depResJsonUrl)
                comFun(true)
            } else {
                Log.Error("加载依赖资源json出错. " + depResJsonUrl)
                comFun(false)
            }

        })
    }

    private loaded3DRes: Laya.Dictionary = new Laya.Dictionary(); //记录加载的lh资源
    private loaded3DDeps: Laya.Dictionary = new Laya.Dictionary();//记录依赖资源引用计数
    /**
     * 批量记录lh资源的依赖计数
     * @param resurls 批量加载成功的lh资源路径 
     * @param comFun 记录完成回调
     */
    private recordLoadedDependencies(resurls: any[], comFun?: Function): void {
        Log.Debug("开始记录 依赖资源")
        let total = resurls.length;
        let count = 0;
        for (let index = 0; index < resurls.length; index++) {
            let element = resurls[index];
            let url = element.url ? element.url : element;
            this.recordLoadedDependency(url, () => {
                count += 1;
                if (count == total) {
                    Log.Debug("完成 依赖资源记录")
                    if (comFun) comFun();
                }
            })
        }
    }

    /**
     * 记录lh资源的依赖计数, 每个lh只记录一次
     * @param resurl 加载成功的lh资源路径
     * @param comFun 记录完成回调
     */
    private recordLoadedDependency(resurl: string, comFun: Function): void {
        if (this.loaded3DRes.get(resurl)) {
            Log.Debug("3d资源已经加载过, 不记录相同依赖资源" + resurl)
            comFun(true);
            return;
        }

        let index = resurl.lastIndexOf(".lh");
        if (index < 0) {
            index = resurl.lastIndexOf(".ls");
            if (index < 0) {
                // Log.Debug("资源不是lh/ls 3d资源, 不进行依赖资源卸载. " + resurl)
                comFun(true)
                return;
            }
        }

        this.loaded3DRes.set(resurl, 1);//记录加载的3d资源

        //把url的lh换成json , 加载json, 卸载json资源
        resurl = resurl.substring(0, index) + ".json"
        Log.Debug("--根据依赖配置文件, 记录加载依赖 " + resurl)
        ResourceManager.GetInstance().loadRes(resurl,
            (param: LoadTaskCallbackParam) => {
                if (param.Ok) {
                    let json = param.Param as DependenciesResInfos
                    Log.Debug("依赖资源json 加载成功")
                    for (let index = 0; index < json.denpendenciesList.length; index++) {
                        let dependentResInfo = json.denpendenciesList[index];
                        let lhParentDir = resurl.substring(0, resurl.lastIndexOf("/"))
                        let depResUrl = lhParentDir + "/" + dependentResInfo.Path;//依赖资源路径

                        //记录依赖计数
                        let refCount = this.loaded3DDeps.get(depResUrl)
                        if (refCount) {
                            this.loaded3DDeps.set(depResUrl, refCount + 1)
                        } else {
                            this.loaded3DDeps.set(depResUrl, 1)
                        }
                    }

                    //卸载完 清理依赖资源json
                    ResourceManager.GetInstance().release(resurl)
                    comFun(true)
                } else {
                    Log.Error("加载依赖资源json出错. " + resurl)
                    comFun(false)
                }
            })
    }

    private taskMap: Laya.Dictionary = new Laya.Dictionary();//记录加载任务<taskid, task>
    private loadingUrlMap: Laya.Dictionary = new Laya.Dictionary();//记录加载任务<url, taskidList>
    static LOADING_TASK_ID: number = 1;
    private createLoadingTask(urlObjectToLoad: any, allUrlObject: any, comFun: Function, failFunc: Function): LoadingTask {
        let task = new LoadingTask();
        if (comFun) task.CompleteCallbackList.push(comFun)
        if (failFunc) task.FailCallbackList.push(failFunc)
        if (urlObjectToLoad instanceof Array) {
            task.LoadingUrlArray = this.converUrlObjectArray(urlObjectToLoad);
            task.AllTaskUrlArray = this.converUrlObjectArray(allUrlObject)
        } else {
            task.LoadingUrlArray = [this.converUrlObject(urlObjectToLoad)];
            task.AllTaskUrlArray = [this.converUrlObject(allUrlObject)]
        }
        task.isArray = task.LoadingUrlArray.length > 1;

        task.TaskID = ResourceManager.LOADING_TASK_ID++;
        return task;
    }

    //返回 true需要加载, false都在加载中
    private recordTask(task: LoadingTask): boolean {
        //监测是否当前task里面的资源都正在加载中.
        let isAllLoading = true;;
        for (let index = 0; index < task.LoadingUrlArray.length; index++) {
            let tempUrl = task.LoadingUrlArray[index];
            if (!this.checkIsLoading(tempUrl)) {
                isAllLoading = false
                break;
            }
        }
        //单资源加载/多资源加载, 所有资源已经在加载中, 添加回调到存在任务中
        if (isAllLoading) {
            for (let index = 0; index < task.LoadingUrlArray.length; index++) {
                //直接添加task, 设置task为完成, 因为所有的资源都依赖其他任务是否完成.
                let existTaskIDList = this.loadingUrlMap.get(task.LoadingUrlArray[index]);
                if (!existTaskIDList) {
                    this.loadingUrlMap.set(task.LoadingUrlArray[index], [task.TaskID])
                } else {
                    existTaskIDList.push(task.TaskID)
                }
                task.LoadingComplete = true;
                this.taskMap.set(task.TaskID, task)
            }
            return false;
        }

        //单资源加载, 没有加载中, 添加新任务
        if (!task.isArray && !isAllLoading) {
            this.loadingUrlMap.set(task.LoadingUrlArray[0], [task.TaskID])
            this.taskMap.set(task.TaskID, task)
            return true;
        }

        //多资源存在至少一个没有加载中的资源,添加新task, 对应url添加新task
        if (task.isArray && !isAllLoading) {
            this.taskMap.set(task.TaskID, task)
            for (let index = 0; index < task.LoadingUrlArray.length; index++) {
                let tempUrl = task.LoadingUrlArray[index];
                let existTaskIDList = this.loadingUrlMap.get(tempUrl);
                if (!existTaskIDList) {
                    this.loadingUrlMap.set(tempUrl, [task.TaskID])
                } else {
                    existTaskIDList.push(task.TaskID)
                }
            }
        }
        return true;
    }

    private checkAllTaskComplete(taskid: number): boolean {
        //监测是否加载完成. 
        let completedTask = this.taskMap.get(taskid) as LoadingTask;
        if (completedTask) {
            //设置当前任务加载完成
            completedTask.LoadingComplete = true;

            //监测当前任务包含几个url资源, 每个资源的所有task是否都结束.  没有结束,不执行回调
            let allTaskComplete = true;
            for (let index = 0; index < completedTask.LoadingUrlArray.length; index++) {
                let tempUrl = completedTask.LoadingUrlArray[index];
                let existTaskIDList = this.loadingUrlMap.get(tempUrl);
                if (existTaskIDList) {
                    for (let index = 0; index < existTaskIDList.length; index++) {
                        let tempTaskId = existTaskIDList[index];
                        let tempCheckTask = this.taskMap.get(tempTaskId) as LoadingTask;
                        if (!tempCheckTask.LoadingComplete) {
                            allTaskComplete = false;
                            //****LOg******************** */
                            Log.Debug("任务id:" + taskid + " 加载完成, 其中url:" + tempUrl + " 还有相关task任务没有完成下载")
                            Log.Debug("完成的任务 id:" + taskid + "包含url")
                            for (let index = 0; index < completedTask.LoadingUrlArray.length; index++) {
                                let element = completedTask.LoadingUrlArray[index];
                                Log.Debug("url:" + element)
                            }
                            Log.Debug("没完成的任务 id:" + tempTaskId + "包含url")
                            for (let index = 0; index < tempCheckTask.LoadingUrlArray.length; index++) {
                                let element = tempCheckTask.LoadingUrlArray[index];
                                Log.Debug("url:" + element)
                            }
                            //****Log******************** */
                            break;
                        }
                    }
                    if (!allTaskComplete) {
                        break;
                    }
                } else {
                    Log.Error("检测加载完成任务的url完成情况, url不存在 " + tempUrl)
                }
            }
            return allTaskComplete
        } else {
            Log.Error("加载完成, taskid不存在 " + taskid)
            return false;
        }

    }

    //任务都加载完成, 执行回调
    private executeCallbackAndClearTask(taskid: number, callbackParam?: any) {
        //执行回调
        //Log.Debug("任务完成, 执行回调")
        let completedTask = this.taskMap.get(taskid) as LoadingTask;
        if (completedTask) {
            let callbackArray = []//保存回调, 删除记录后最后执行回调
            let callbackParamArray = [];//callback参数
            //遍历任务的所有待加载资源url, 检测每个url相关的加载任务, 执行任务的回调
            for (let index = 0; index < completedTask.LoadingUrlArray.length; index++) {
                let tempUrl = completedTask.LoadingUrlArray[index];
                let existTaskIDList = this.loadingUrlMap.get(tempUrl);
                for (let index = 0; index < existTaskIDList.length; index++) {
                    let tempTaskId = existTaskIDList[index];
                    let tempCallbackTask = this.taskMap.get(tempTaskId) as LoadingTask;
                    if (tempCallbackTask.CallBackExecuted) continue;//已经执行过

                    //检测任务是否成功, 执行对应的回调
                    let isSucceeded = this.checkLoadedSuccess(tempCallbackTask.LoadingUrlArray);
                    let callbackList = tempCallbackTask.CompleteCallbackList//只用complete回调,用ok区分成功失败 isSucceeded ? tempCallbackTask.CompleteCallbackList : tempCallbackTask.FailCallbackList;
                    for (let index = 0; index < callbackList.length; index++) {
                        let callback = callbackList[index];
                        callbackArray.push(callback);
                        let param = new LoadTaskCallbackParam(isSucceeded, callbackParam ? callbackParam : CommonUtil.ReformatURLArray(tempCallbackTask.AllTaskUrlArray))
                        callbackParamArray.push(param)
                    }
                    tempCallbackTask.CallBackExecuted = true;
                    //Log.Debug("执行任务的回调 url:" + tempUrl + " taskID:" + tempTaskId)
                }
            }

            //删除任务相关的urlLoading和taskMap, 删除后再执行回调. 避免回调中继续加载资源.
            for (let index = 0; index < completedTask.LoadingUrlArray.length; index++) {
                let tempUrl = completedTask.LoadingUrlArray[index];
                let existTaskIDList = this.loadingUrlMap.get(tempUrl);
                for (let index = 0; index < existTaskIDList.length; index++) {
                    let tempTaskId = existTaskIDList[index];
                    this.taskMap.remove(tempTaskId);
                    //Log.Debug("删除任务id " + tempTaskId)
                }
                this.loadingUrlMap.remove(tempUrl);
                //Log.Debug("删除loadingurl" + tempUrl)
            }

            //执行回调
            for (let index = 0; index < callbackArray.length; index++) {
                let callback = callbackArray[index];
                callback(callbackParamArray[index])
            }

            if (callbackArray.length == 0) {
                let isSucceeded = this.checkLoadedSuccess(completedTask.LoadingUrlArray);
                Log.Warn("当前任务执行 " + (isSucceeded ? "成功" : "失败") + ", 但是没有设置对应回调! task:" + taskid)
            }

        } else {
            Log.Error("任务不存在, 无法执行回调 " + taskid)
        }


    }

    public checkIsLoading(formatedUrlObj: any): boolean {
        let url = this.converUrlObject(formatedUrlObj);
        let existTaskIDList = this.loadingUrlMap.get(url)
        return existTaskIDList ? true : false;
    }


    private unloadingMap: Laya.Dictionary = new Laya.Dictionary();//记录正在卸载的资源
    /**
     * 记录正在卸载的资源
     * @param urlObject 资源路径
     */
    private recordUnloading(urlObject: any) {
        let url = urlObject.url ? urlObject.url : urlObject

        let exist = this.unloadingMap.get(url)
        if (exist) {
            Log.Warn("已经在卸载ap中, 重复记录" + url)
            return;
        } else {
            this.unloadingMap.set(url, true)
            //Log.Debug("记录卸载unloading:" + url)
        }

    }

    /**
     * 记录已经卸载完成的资源
     * @param urlObject 资源路径
     */
    private recordUnloaded(urlObject: any) {
        let url = urlObject.url ? urlObject.url : urlObject
        let exist = this.unloadingMap.get(url)
        if (!exist) {
            Log.Warn("没有在卸载map中, 无法删除记录" + url)
            return;
        } else {
            this.unloadingMap.remove(url)
            Log.Debug("记录卸载完成/取消卸载:" + url)
        }
    }

    private converUrlObjectArray(urlObjectArray: any[]): string[] {
        let urlArray = []
        for (let index = 0; index < urlObjectArray.length; index++) {
            let element = urlObjectArray[index];
            urlArray.push(this.converUrlObject(element))
        }
        return urlArray;
    }

    private converUrlObject(urlObject: any): string {
        return urlObject.url ? urlObject.url : urlObject
    }

    //正在加载/没有加载的url
    private getNotLoadingUrl(notLoadedUrllist: any[]): any[] {
        let notLoadingUrlList = []
        for (let index = 0; index < notLoadedUrllist.length; index++) {
            let url = CommonUtil.ConverUrlObject(notLoadedUrllist[index]);
            if (!this.checkIsLoading(url)) {
                notLoadingUrlList.push(url);
            }
        }
        return notLoadingUrlList
    }
}

class DependenciesResInfos {
    denpendenciesList: DependenciesResInfo[];
}

class DependenciesResInfo {
    public Path: string;
    public Type: string;
}

/**
 * 资源加载task
 */
class LoadingTask {
    public TaskID: number;
    public CompleteCallbackList: Function[] = []
    public FailCallbackList: Function[] = []
    public isArray: boolean = false; //是否单个或array
    public LoadingUrlArray: string[];//所有需要加载/正在加载的url
    public AllTaskUrlArray: string[];//所有的url路径 包含已经加载的

    public LoadingComplete = false;
    public CallBackExecuted = false;
}

class LoadTaskCallbackParam {
    public Ok: boolean;
    public Param: any;
    constructor(ok: boolean, param: any) {
        this.Ok = ok;
        this.Param = param;
    }
}