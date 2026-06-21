export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/match/index',
    'pages/queue/index',
    'pages/mine/index',
    'pages/service-detail/index',
    'pages/master-detail/index',
    'pages/order-detail/index',
    'pages/publish-service/index',
    'pages/queue-detail/index',
    'pages/master-orders/index',
    'pages/master-workbench/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#2E7D32',
    navigationBarTitleText: '磨刀修剪上门',
    navigationBarTextStyle: 'white'
  },
  tabBar: {
    color: '#86909C',
    selectedColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/match/index',
        text: '匹配'
      },
      {
        pagePath: 'pages/queue/index',
        text: '队列'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      }
    ]
  }
})
