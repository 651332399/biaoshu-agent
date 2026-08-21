// WPS 加载项引导脚本。**必须是非模块脚本**——WPS 按名字回调全局的
// OnAddinLoad / OnAction / OnGetEnabled，打成 ES module 就挂不上去。
//
// 这里只做「把任务窗格开出来」，没有业务逻辑。业务全在任务窗格里的 React
// （src/wps/taskPane.tsx），走 RuntimeAdapter 访问 JSAPI。
// 加载项不做格式调整、不做判定，见 tasks/wps-addon-end-to-end-flow-2026-08-18.md §5.2 / §5.3。

/* eslint-disable no-var */

function GetUrlPath() {
    var url = window.location.href
    var index = url.lastIndexOf('/')
    return index > 0 ? url.substring(0, index) : url
}

function showTaskPane(toggle) {
    var app = window.Application
    var id = app.PluginStorage.getItem('biaoshu_taskpane_id')
    var pane
    if (!id) {
        pane = app.CreateTaskPane(GetUrlPath() + '/taskpane.html')
        app.PluginStorage.setItem('biaoshu_taskpane_id', pane.ID)
        pane.Visible = true
        return
    }
    pane = app.GetTaskPane(id)
    pane.Visible = toggle ? !pane.Visible : true
}

// 整个加载项里第一个执行的函数
function OnAddinLoad(ribbonUI) {
    if (typeof window.Application.ribbonUI !== 'object') {
        window.Application.ribbonUI = ribbonUI
    }
    // 自动开窗格，用户不必先点按钮。§7.1 的免弹窗方案靠的就是 OnAddinLoad 自动执行；
    // 延时是等 WPS 主窗口就绪，探针阶段实测 3s 稳。
    setTimeout(function () {
        try { showTaskPane(false) } catch (e) { /* 主窗口没就绪就算了，用户还能点按钮 */ }
    }, 3000)
    return true
}

function OnAction(control) {
    if (control.Id === 'btnTaskPane') showTaskPane(true)
    return true
}

function OnGetEnabled() {
    return true
}
