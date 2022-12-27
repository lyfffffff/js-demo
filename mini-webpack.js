/**
 * 一个基于 babel 的 mini webpack
 */

/**
 * 什么是 AST 树？为什么寻找依赖关系要将源码转为 AST 树？
 * 若不转换为 AST 树，按照字符串的形式解析代码，会很麻烦，例如定义了一个字符串变量，var a = 'import "./index.js"'，无法判断其是引用依赖还是字符串。
 * AST 表示抽象语法树，会将页面代码转换为 json 字符串，拥有一系列规则，能够更快捷方便地分析页面代码
 * 一般使用 babel 相关的插件进行将 JS 源码转为 AST 树
 * 代码转 AST 的工具网页：https://astexplorer.net/
 * 将 JS 源码转为 AST 树，需使用 babylon 库
 * 遍历 AST 树需使用 babel-traverse 库
 * 将 AST 库转为源码需使用 babel-core 库
 * 将 ES6 及以上的转为 ES5 需使用 babel-preset-env 库
 * 如何将打包后的代码在指定位置输出？指定位置需使用 path 库、输出需使用 fs 库
 */

/**
 * 缺陷
 * 只能使用 es module 的形式导入，若使用 require 导入，最终会找不到该模块而报错
 * 只能解析 .js 文件
 * 不具备 loader 和 plugins
 */

const fs = require("fs"); // fs 操作文件及文件夹
const path = require("path"); // path 操作文件路径
const babylon = require("babylon"); // babylon 将语法转为 AST 树
const traverse = require("babel-traverse").default; // babel-traverse 对 AST 树进行遍历
const { transformFromAst } = require("babel-core"); // bebel-core 将 AST 树转化为 ES5 以下的代码

const entry = "./src/main.js"; // 入口文件
let result = null; // 最终的打包文件内容
let ID = 0; // 模块的 id

// 1，解析入口文件
function createGraph(entry) {
  const mainAsset = createAsset(entry); // 获取入口文件的依赖关系
  const queue = [mainAsset];
  for (const asset of queue) {
    asset.mapping = {};
    const dirname = path.dirname(asset.filename); // 获取模块所在目录
    asset.dependencies.forEach((relativePath) => {
      const absolutePath = path.join(dirname, relativePath); // relativePath 是相对模块的路径，通过模块所在目录和相对模块路径，获取依赖文件相对本文件路径
      const child = createAsset(absolutePath); // 递归解析引用模块的资源
      asset.mapping[relativePath] = child.id; // 推入依赖资源的 id
      queue.push(child); // 将依赖资源 child 推入依赖图，是一个广度遍历树
    });
  }
  return queue; // 最终形成的依赖图
}

// 2，根据文件内容，获取该文件所依赖的文件
function createAsset(filename) {
  const content = fs.readFileSync(filename, "utf-8"); // 获取文件内容
  // 并不是遍历去寻找 import require 等字眼确认依赖，而是将 js 语法转为 AST 树

  const ast = babylon.parse(content, {
    sourceType: "module", // 具有 ES6 的文件应以 module 形式解析，默认值为 script
  });

  const dependencies = []; // 保存所依赖的模块的相对路径

  // 遍历 AST 树，ImportDeclaration 表示查找所有的 import 节点
  // 为什么不查找 require 导入的文件，因为 require 是 ExpressionStatement，且没有 value 可以保存
  traverse(ast, {
    ImportDeclaration: ({ node }) => {
      dependencies.push(node.source.value); // 将 import 所引用的路径保存，缺点，require 引入的文件，并没有在依赖图中
    },
  });

  // 将 AST 数转换为源代码，此时 import 被换成 require，而将 require 转换执行就可以
  const { code } = transformFromAst(ast, null, {
    presets: ["env"], // 设置 `babel-preset-env` 将 ES6 以及上代码转换为 ES5
  });

  const id = ID++; // 通过递增计数器，为此模块分配唯一标识符, 用于缓存已解析过的文件

  return {
    id, // 文件 id （唯一）
    filename, // 文件路径
    dependencies, // 文件所引入的文件
    code, // 文件代码
  };
}

// 根据所有依赖图谱，生成打包后的文件内容
function bundle(graph) {
  let modules = "";
  // modules 将依赖图谱由数组转为格式为 {id:[fn,mapping]} 的对象
  // mapping 用于递归在 modules 找到对应的依赖
  graph.forEach((mod) => {
    modules += `${mod.id}:[
            function(require,module,exports){${
              mod.code
            }}, // 参数 require 会在遇到引入依赖时调用
            ${JSON.stringify(mod.mapping)}
        ],`;
  });

  const result = `
  (function(modules){
    function require(id){
        const [fn, mapping] = modules[id];
        
        function localRequire(name){
            return require(mapping[name]); // 根据 mapping 找到依赖的 modules[mapping[name]]
        }
        const module = {exports:{}};
        fn(localRequire,module,module.exports); // localRequire 会在遇到引入依赖 require 时调用，即执行依赖文件
        return module.exports;
    }
    require(0)
  })({${modules}})
  `;
  return result;
}
result = bundle(createGraph(entry));

// 4，将打包内容放置在出口文件中
// dist 文件夹需创建
// main 文件需创建
/**
 * fs.mkdir(path,callback) // 当创建已有目录时，callback 有参数 err
 * fs.writeFile(path,data,callback) // path 相对于当前文件所在目录
 */
fs.mkdir("minidist", (err) => {
  fs.writeFile("minidist/main.js", result, (err1) => {
    if (!err1) console.log("打包成功");
  });
});
