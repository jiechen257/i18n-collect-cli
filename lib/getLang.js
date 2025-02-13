
const fs = require('fs')
const path = require('path')
const os = require('os')
const filePath = path.resolve('./src')
const readline = require('readline')
let test = /[\u4E00-\u9FA5\uF900-\uFA2D\u3001-\u3015]+[\u4E00-\u9FA5\uF900-\uFA2D\uff01\uff08-\uff1f\u3001-\u3015\u0020a-zA-Z\d\\\/+*/-]*/
let rl = null
let lang = {}
let isNote = false
let dirU = os.type().toLowerCase().includes('window') ? '\\' : '/' // window环境使用‘\\’mac系统使用‘/’

function getFileList(dir, pages, filesList = [], ignoredir) {
  const files = fs.readdirSync(dir)
    files.forEach((item, index) => {
    if(ignoredir && ignoredir.includes(item)) return
    let fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      return getFileList(fullPath, pages, filesList, ignoredir) // 递归读取文件
    } else {
      filesList.push(fullPath)
    }
  })
  return filesList
}
function readFileList (dir, pages, ignoredir) {
  // return new Promise((resolve, reject) => {
    let filesList = []
    let ps = []
    getFileList(dir, pages, filesList, ignoredir)
    filesList.forEach((fullPath) => {
      let p = null
      let path2 = fullPath.replace(process.cwd() + dirU + 'src' + dirU, '')
      if (pages.some(pagedir => path2.includes(pagedir))) {
        pages.some(pagedir => {
          if(path2.includes(pagedir)){
            path2 = path2.replace(pagedir + dirU, '')
            return true
          }
          return false
        })
        let key = path2.substr(0, path2.indexOf(dirU))
        let extname = path.extname(fullPath)
        if (['.vue', '.js'].includes(extname)) {
          p = new Promise((resolve,reject) => {
            isNote = false
            rl = readline.createInterface({
              input: fs.createReadStream(fullPath)
            })
            let lineIndex = 0
            rl.on('line', (line) => {
              lineIndex ++
              let content = isNote ? '' : line
              if (line.includes('/*')) {
                isNote = true
                content = line.slice(0, line.indexOf('/*'))
              }
              if (line.includes('*/')) {
                if (isNote) {
                  isNote = false
                  content = line.slice(line.indexOf('*/') + 2)
                }
              }
              if (line.includes('<!--')) {
                isNote = true
                content = line.slice(0, line.indexOf('<!--'))
              }
              if (line.includes('-->')) {
                if (isNote) {
                  isNote = false
                  content = line.slice(line.indexOf('-->') + 3)
                }
              }
              if (isNote && !content) return
              if (line.includes('//')) content = line.slice(0, line.indexOf('//'))

              let str = content.match(test)
              while (str) {
                if (str) {
                  str = str[0]
                  let otherStr = ''
                  if (content.indexOf('\'' + str) > -1) {
                    let contentArr = content.split(str)
                    otherStr = contentArr[1] ? contentArr[1].slice(0, contentArr[1].indexOf('\'')) : ''
                  }
                  if (content.indexOf('"' + str) > -1) {
                    let contentArr = content.split(str)
                    otherStr = contentArr[1] ? contentArr[1].slice(0, contentArr[1].indexOf('"')) : ''
                  }
                  
                  if (content.indexOf('>' + str) > -1) {
                    let contentArr = content.split(str)
                    otherStr = contentArr[1] ? contentArr[1].slice(0, contentArr[1].indexOf('<')) : ''
                  }
                  if (content.indexOf(str + '"') > -1) {
                    let contentArr = content.split(str)
                    let reverseStr = contentArr[0].split("").reverse()
                    str = reverseStr.splice(0, reverseStr.indexOf('"')).reverse().join("") + str
                  } else {
                    str += otherStr // .replace(/{{(.*)}}/g, '')
                  }
                  if (lang[key]) {
                    lang[key].push(str)
                  } else {
                    lang[key] = [str]
                  }
                }
                content = content.slice(0, content.indexOf(str)) + content.slice(content.indexOf(str) + str.length)
                str = content.match(test)
              }
            })
            rl.on('close', () => {
              resolve(lang)
            })
          })
          ps.push(p)
        }
      }
    })
    return Promise.all(ps)
  // })
}

function inputLangs (fileName) {
  let item

  let cs_Lang = {
    cs_common: {}
  }

  let allObj = {}
  for (item in lang) {
    let arr = lang[item]
    for (let val of arr) {
      if (allObj[val]) {
        allObj[val] = 2
      } else {
        allObj[val] = 1
      }
    }
  }
  let otherObjs = {}

  // 提取公共
  let count = 0
  for (let val in allObj) {
    if (allObj[val] === 2) {
      count++
      cs_Lang['cs_common']['cs_' + count] = val
      otherObjs[val] = true
    } else {
    }
  }
  for (item in lang) {
    let arr = lang[item]
    if(!cs_Lang[`cs_${item}`]){
      count = 0
      cs_Lang[`cs_${item}`] = {}
    } else {
      count = cs_Lang[`cs_${item}`].length
    }
    for (let val of arr) {
      if (!otherObjs[val]) {
        count++
        cs_Lang[`cs_${item}`]['cs_' + count] = val
      } else {
      }
    }
  }
  console.log('----------------------------------------------------\n')

console.log(cs_Lang)
  let str = JSON.stringify(cs_Lang, null, "  ")

  fs.writeFile(fileName, str, function (error) {
    if (error) {
      console.log(error)
    } else {
      console.log('collect lang finish!')
    }
  })
}

module.exports.getLang = (src = 'src', pages = ['pages', 'components'], fileName = 'zh_cn.json') => {
  readFileList(path.join(process.cwd(), src), pages).then(res => {
    inputLangs(fileName)
  }).catch(err => {
    console.log(err)
  })
}
