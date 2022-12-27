/**
 * 使用 Node 内置库 http 创建一个本地服务器
 * 使用 exprss 库创建一个本地服务器，缺点是需要安装库
 */

let list = [];
let num = 0;

for (let i = 0; i < 100; i++) {
  // 创建接口假数据
  num++;
  list.push({
    src: "https://miro.medium.com/fit/c/64/64/1*XYGoKrb1w5zdWZLOIEevZg.png",
    text: `hello world ${num}`,
    tid: num,
  });
}

const http = require("http");
const port = 8000;

// 通过 http 模块的 createServer 创建服务器
http
  .createServer(function (req, res) {
    // for Cross-Origin Resource Sharing (CORS)
    res.writeHead(200, {
      "Access-Control-Allow-Origin": "*", // 是否允许跨域
      "Access-Control-Allow-Methods": "DELETE,PUT,POST,GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    res.end(JSON.stringify(list));
  })
  .listen(port, function () {
    console.log("server is listening on port " + port);
  });

// 引入express模块
var express = require("express");
// 获取服务实力对象
var app = express();
app.get("/", (req, res) => {
  res.send(list);
});
// 监听端口
app.listen(3000, (err) => {
  if (!err) console.log("服务器已启动 端口号3000:::");
});
// 配置路由
app.post("/person", (req, res) => {
  res.json({
    name: "zhangsan",
    age: 20,
  });
});

// 检测结果
const axios = require("axios");
axios.post("http://localhost:3000/person").then((res) => {
  console.log(res.data);
});
