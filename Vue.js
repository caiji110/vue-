class Vue{
    constructor(options){
       // console.log(options);
        this.$data = options.data
         //定义数据劫持的方法
        Observe(this.$data)
        //进行属性代理
        Object.keys(this.$data).forEach(item => {
            Object.defineProperty(this,item,{
                enumerable: true,
                configurable: true,
                get(){
                    return this.$data[item]
                },
                set(newVal){
                    this.$data[item] = newVal
                }
            })
        })
        Compile(options.el,this)
    }
   
}
function Observe(obj){
    //终止递归的条件，info.a
  if(!obj||typeof obj !='object') return
    const dep = new Dep()
    Object.keys(obj).forEach(item => {
        let value = obj[item]
        Observe(value)  //进行递归，拿到二级对象的键名
        Object.defineProperty(obj,item,{
            enumerable: true,
            configurable: true,
            get(){
                console.log(Dep.target);
                Dep.target && dep.addSubs(Dep.target)  //往收集者中添加观察者
                return value; //为什么写成obj[item]会卡死？？？浏览器报错栈溢出？？
            },
            set(newVal){
              value = newVal  //这里是给value赋值，为什么可以改变obj[item]的值？并且如果直接给obj[item]赋值依旧报错栈溢出？
                console.log('有改变了我的值');
                Observe(newVal)
                dep.notify()
                return;
            }
        })
    })
}
//将vue.data上的值渲染到页面上
function Compile(el,vm){
    
    vm.$el = document.querySelector(el);

    const fragment = document.createDocumentFragment() //创建文档片段，把页面上的元素移到里面，避免频繁的对页面进行重绘
    
    while ((childNode = vm.$el.firstChild)) {
        fragment.appendChild(childNode) //将页面上的元素节点移到文档片段中
      }

      // 进行模板编译
    replace(fragment);
  //重新将节点添加
  vm.$el.appendChild(fragment);

  function replace(node){
     
    const regMustache = /\{\{\s*(\S+)\s*\}\}/
    //进行替换(文本节点)
    if(node.nodeType === 3){
        const text = node.textContent
        const regtext = regMustache.exec(text);
      if(regtext){
        //  console.log(regtext);
          //拿到data里面的值
         const value = regtext[1].split(".").reduce((newobj,k) => newobj[k],vm)
         //进行正则替换
         node.textContent = text.replace(regMustache,value)
         //生成对应的观察者实例
        
         new Watcher(vm,regtext[1],(newvalue) =>{
             
            node.textContent = text.replace(regMustache,newvalue)
         })
      }
      return
    }
    // 判断是否为输入框
    if(node.nodeType === 1 && node.tagName.toUpperCase() === 'INPUT'){
       
       const arr = Array.from(node.attributes)
       console.log(arr);
      const findresult = arr.find(item => item.name === 'v-model') //返回查询，没查到是undefined
    
      if(findresult){
        //实现文本框里的内容跟已有的数据同步
          const res = findresult.value
          const value = res.split(".").reduce((newobj,k) => newobj[k],vm)
          node.value = value;
          new Watcher(vm,res,(newvalue) => {
            node.value = newvalue
          })
        //监听输入框的输入，实现同时更新data里面的输入
      
        node.addEventListener("input",(e)=> {
            const newvalue = e.target.value
            //为了解决二级对象，例info.a
            const keyvalue = res.split(".")
            //拿到Info
            const obj = keyvalue.slice(0, keyvalue.length - 1).reduce((newObj, k) => newObj[k], vm)
            //a
          const leafKey = keyvalue[keyvalue.length - 1]
          //info[a]
          obj[leafKey] = newvalue
        })
      }
    }
    //不是文本节点，进行递归处理
    node.childNodes.forEach((item) => replace(item))
                        
}
}
//依赖收集的类/订阅者
class Dep{
    constructor(){
        //观察的对象
        this.subs = []
    }
    //添加观察的对象
    addSubs(Watcher){
      console.log(Watcher);
        this.subs.push(Watcher)
    }
    //通知观察者进行数据更新
    notify(){
      
        this.subs.forEach(item => {
            console.log(item);
            return item.update()})
    }
}
class Watcher{
   constructor(vm,key,cb){
       this.vm = vm ;
       this.key = key;
       this.cb = cb;
       Dep.target = this;
     //因为读取了数据，所以代码跳转至数据劫持函数中
       key.split('.').reduce((newObj, k) => newObj[k], vm)
       Dep.target =  null;
   }
   update(){
       //console.log('我已收到通知正在更新');
       //console.log(this.key.split("."));
       //拿到各自对应的最新值进行遍历
       const value = this.key.split(".").reduce((newobj,k) => newobj[k] ,this.vm);
       this.cb(value)
   }
}