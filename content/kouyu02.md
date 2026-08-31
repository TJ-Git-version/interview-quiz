# 02 · JVM 与 Spring 全家桶（口语版）

---

## 一、JVM

### 1. JVM 内存区域？

**结论**：堆 + 方法区（元空间）是共享的，栈和 PC 是线程私有的。
**展开**：堆放对象，是 GC 的主战场，分新生代和老年代；虚拟机栈每个线程一份，放方法栈帧；方法区在 JDK8 之后是元空间（本地内存）；程序计数器记录当前执行位置。**我排查内存问题时先分清「是堆、还是线程、还是元空间」。**

---

### 2. 对象创建过程？

**结论**：类加载检查 → 分配内存 → 零值初始化 → 设置对象头 → 执行构造方法。
**展开**：其实重点是分配内存那步，用指针碰撞或空闲列表；然后给对象头写类型指针、hash 等；最后调用构造方法。真正放到堆里给业务用的是构造完之后。

---

### 3. 类加载 / 双亲委派？

**结论**：父加载器先加载，父不加载才自己加载。
**展开**：流程是加载→验证→准备→解析→初始化。双亲委派保证一个类只被加载一次，也防止用户自定义 `java.lang.String` 这种核心类。
**追问备用**：会被破坏吗？—— 会，比如 JDBC 的 SPI、Tomcat 这种 Web 容器，需要打破双亲委派，各自加载自己的类。我能说出来，说明我懂这块。

---

### 4. GC 算法与常用收集器？

**结论**：新生代用复制，老年代用标记整理；G1 用 Region 分块，可预测停顿。
**展开**：标记-清除会产生碎片；标记-复制适合新生代（存活对象少）；标记-整理适合老年代。收集器里 G1 是 JDK9+ 默认，把堆分成 Region 管理，能设定停顿目标；ZGC 用染色指针，能做到极低停顿。

---

### 5. 怎么判断对象可回收（GC Roots）？

**结论**：可达性分析，从 GC Roots 出发，不可达就回收。
**展开**：GC Roots 包括虚拟机栈里的引用、静态变量、常量、JNI 引用等。不用引用计数，因为它解决不了循环引用。

---

### 6. OOM / 内存泄漏怎么排查？【重点】

**结论**：先看线程、再抓堆 dump、分析大对象和引用链。
**展开**：我一般这样：先用 `jps` 找到进程，用 `jstack` 看线程状态（有没有死锁、阻塞）；再用 `jmap` 导出堆 dump，用 MAT 或 JVisualVM 分析——看是哪些对象占了大头、有没有被不该持有引用却一直留着。Arthas 能在线做 `heap`、`histogram`、`thread`，不用重启就能看。
**结合项目**：我项目里有 AI 调用、流式、缓存这些，容易出「对象没释放」或「缓存无限增长」，所以我会重点盯**无界缓存、线程池、大对象**。

---

### 7. 频繁 Full GC 怎么排查？

**结论**：看 GC 日志和堆占用，多是内存泄漏、大对象、堆太小。
**展开**：我会先打开 GC 日志（`-Xlog:gc`），用 `jstat` 观察 GC 频率和回收量；如果每次回收后堆还是慢慢涨，大概率是泄漏。再结合 dump 看是哪个类型。**关键是先监控、先定位，再调参，别一上来就加大堆。**

---

### 8. JVM 调优思路？

**结论**：先定位问题，是 CPU、内存还是 GC，再针对调。
**展开**：我会先确认瓶颈，再决定调 Xms/Xmx、新生代比例、选哪个收集器。用停顿和吞吐做权衡：要低延迟就用 G1/ZGC，要吞吐就可能牺牲一点停顿。**我的原则是「不盲目调参，一切以监控和数据说话」。**

---

## 二、Spring 全家桶

### 9. IOC / DI 是什么？

**结论**：把创建对象和依赖关系的控制权交给容器，解耦。
**展开**：原来对象 new 依赖要自己管理，现在交给 Spring 容器统一创建和注入，我们只声明「要什么」。好处是解耦、方便替换实现、方便测试。

---

### 10. Bean 生命周期？

**结论**：实例化 → 属性填充 → 初始化 → 使用 → 销毁。
**展开**：核心是实例化、属性填充（依赖注入）、Aware 回调、BeanPostProcessor 前后置、初始化（@PostConstruct）、使用、销毁（@PreDestroy）。**AOP 代理就是在 BeanPostProcessor 后置这步织入的**，所以增强的类其实是个代理。

---

### 11. 循环依赖怎么解决（三级缓存）？

**结论**：三级缓存提前暴露早期对象。
**展开**：A 依赖 B、B 依赖 A，Spring 用三级缓存解决：第一层存「已经初始化好的」，第二层存「早期引用」，第三层存「对象工厂」。A 创建时先把工厂放三级缓存，B 引用 A 时能从这拿到早期的 A。**注意：构造器注入的循环依赖没法解**，因为对象还没实例化。

---

### 12. AOP 原理？

**结论**：动态代理，JDK 代理或 CGLIB。
**展开**：有接口就用 JDK 动态代理（Proxy + InvocationHandler），没有接口就用 CGLIB 生成子类。切面就是「切点 + 通知」，通知分前置、后置、环绕、异常、返回。我用过 AOP 做日志、权限校验、事务这些。

---

### 13. Spring 事务传播行为？

**结论**：最常用 REQUIRED 和 REQUIRES_NEW。
**展开**：REQUIRED 是默认，有事务就加进去，没有就新建；REQUIRES_NEW 是挂起当前、新建一个独立事务，适合「这个子步骤不能因为外面失败而回滚」；NESTED 是嵌套，有保存点。**选型看「业务要不要严格同一事务」。**

---

### 14. 事务失效场景？【重点】

**结论**：自调用、非 public、异常被吃、不经过代理都会失效。
**展开**：①同类内自调用不走代理，@Transactional 不生效；②方法非 public；③异常被 try-catch 吞掉；④类没被 Spring 管理；⑤多线程里事务不跨线程；⑥传播行为配错。**我排查事务问题会先看这些。**
**【结合项目】**：我同步训练日志、和多系统打通的场景，会特别注意哪些要同一事务、哪些要独立提交。

---

### 15. Spring Boot 自动配置原理？

**结论**：@EnableAutoConfiguration 导入自动配置类，按条件生效。
**展开**：@SpringBootApplication 里含 @EnableAutoConfiguration，通过 @Import 导入 AutoConfigurationImportSelector，去读取 META-INF 里的配置类；每个配置类用 @ConditionalOnClass、@ConditionalOnMissingBean 这些条件控制「什么情况下才生效」。所以我们引入 starter 就能直接用。

---

### 16. starter 是什么？

**结论**：自动配置 + 依赖的封装，引入即用。
**展开**：比如 spring-boot-starter-web，引入就有 web 和自动配置。自定义 starter 就是写一个自动配置类 + 注册到 imports 文件。**理解这个对排查「为什么配置不生效」很有用。**

---

### 17. Spring Cloud Alibaba 组件？

**结论**：Nacos（注册+配置）、Sentinel（限流熔断）、Seata（分布式事务）。
**展开**：Nacos 做服务注册发现和配置中心；Sentinel 用滑动窗口/令牌桶做限流，对慢调用、异常做熔断降级；Seata 做分布式事务。我做过高并发和微服务，会关注服务治理。

---

### 18. Sentinel 限流/熔断原理？

**结论**：滑动窗口限流 + 异常/慢调用熔断 + 降级。
**展开**：Sentinel 以资源为维度做流控，支持 QPS、并发线程数；熔断按慢调用比例、异常比例/数量触发，触发后走 fallback 降级。**它的价值是保护系统不被流量打死、不雪崩。**

---

### 19. Seata 分布式事务？

**结论**：AT 自动、TCC 手动三阶段、SAGA 长事务、XA 数据库级。
**展开**：AT 用两阶段 + 全局锁，自动生成反向 SQL 回滚，性能好、侵入小，适合大多数场景；TCC 是 try-confirm-cancel 手动，强一致但侵入高；SAGA 是长事务、最终一致。**选型看「要强一致还是要性能和简单」。**

---

## 三、WebFlux / Reactor / SSE（重点，你项目核心）

### 20. 响应式编程是什么？

**结论**：事件驱动 + 非阻塞，少量线程处理海量请求。
**展开**：它把「一个请求占一个线程」变成「事件驱动」，用少量线程就能扛高并发。数据流用 Mono（0-1 个）/Flux（0-N 个）表示，支持异步和背压。

---

### 21. WebFlux vs WebMVC？

**结论**：WebMVC 同步阻塞，WebFlux 基于 Netty 非阻塞。
**展开**：WebMVC 是一请求一线程；WebFlux 基于 Reactor + Netty，少量线程高并发，特别适合 IO 密集。**但有个坑：WebFlux 里不能做阻塞 IO（比如同步 JDBC、Thread.sleep），否则会卡住事件循环，反而更慢。** 我自己做流式对话就是 WebFlux。

---

### 22. 背压 backpressure？

**结论**：下游处理不过来时反馈给上游，控制生产速度。
**展开**：通过 request(n) 让下游告诉上游「我一次能处理多少」。防止上游一味猛发把下游压垮。这是响应式的核心价值之一。

---

### 23. SSE 和 WebSocket 的区别？【必答，你项目】

**结论**：看要不要双向通信；AI 流式用 SSE。
**展开**：SSE 是**单向服务端推客户端**，走 HTTP，自动重连、兼容性、实现都简单；WebSocket 是**双向全双工**，客户端服务端能实时互发。我的场景是 AI 流式输出，**只需要服务端推**，所以用 SSE 够——简单、走 HTTP、断线自动重连。如果要做聊天室那种双向实时互发，才用 WebSocket。
**取舍**：不是为了「用更高级的技术」，而是**按需求选**。非要在 AI 流式上套 WebSocket，是用更大的复杂度换用不上的能力。

---

### 24. WebFlux 怎么实现 SSE？

**结论**：返回 Flux，用 text/event-stream。
**展开**：Controller 返回 Flux<ServerSentEvent>（或 Flux<String>），设置 text/event-stream，框架会按每个元素推一条事件。前端用 EventSource 接收。**配合 ChatModel 的 stream 返回 Flux，就能逐 token 推给前端。**

---

### 25. 响应式里阻塞调用有什么坑？

**结论**：会阻塞事件循环，拉低整体吞吐。
**展开**：在 Reactor 线程里做同步 JDBC、sleep、阻塞 IO，会占住事件循环，导致其他请求也变慢。应该用异步驱动（如 R2DBC）或者放到专门的边界调度器。
**【结合项目】**：我流式对话里，凡是访问 DB/Redis 的地方都尽量异步，避免影响首字延迟和整体并发。


---

## 四、补充（JVM / Spring 高频补充）

**JVM 补充**

### 26. JVM 常见的 OOM 类型有哪些？【重点】

**结论**：堆溢出、栈溢出（StackOverflowError）、元空间溢出、直接内存溢出，报错和原因各不相同。
**展开**：①堆溢出 `java.lang.OutOfMemoryError: Java heap space`——对象太多或泄漏；②栈溢出 `StackOverflowError`——递归太深、方法栈帧太多；③元空间溢出 `Metaspace`——动态生成的类太多（反射、CGLIB、JSP）；④直接内存溢出 `Direct buffer memory`——NIO/Netty 的 DirectByteBuffer 没释放。**排查时先看报错信息，基本就能定位是哪一类，再决定看堆、栈还是元空间。**

---

### 27. Minor GC / Full GC 什么时候触发？对象怎么晋升老年代？

**结论**：Eden 满触发 Minor GC；老年代满或空间分配担保失败触发 Full GC。对象年龄到阈值、大对象、动态年龄判定都会进老年代。
**展开**：新生代 Eden 满就 Minor GC，存活对象移 Survivor，年龄 +1，默认到 15（`-XX:MaxTenuringThreshold`）晋升；大对象直接放老年代（避免在 Eden/Survivor 反复复制）；动态年龄判定——Survivor 里同龄对象超过一半，就把这批直接送老年代；晋升时老年代放不下会触发 Full GC 或空间分配担保。
**追问备用**：为什么 Eden : Survivor = 8 : 1:1？——大部分对象朝生夕死，用复制算法，浪费 10% 换零碎片和低复制成本。

---

### 28. CMS 收集器？

**结论**：JDK8 老项目常用，并发标记清除，停顿可控但有碎片。
**展开**：CMS 是「标记-清除」的并发老年代收集器，JDK8 时代很主流；缺点是并发失败会退化为 Serial Old、会产生内存碎片。**现在新项目用 G1，但如果面试的是老项目（JDK8 + CMS），我要能说清它的优缺点。**

---

### 29. 弱引用 / 软引用 / 虚引用？

**结论**：软引用内存不足才回收，弱引用下次 GC 就回收，虚引用为了回收通知。
**展开**：①软引用 SoftReference——内存不足才回收，适合做缓存（本地图片/对象缓存）；②弱引用 WeakReference——只要 GC 就回收，适合做 Map 的 key 防内存泄漏（WeakHashMap、ThreadLocal）；③虚引用 PhantomReference——拿不到对象，只能配合引用队列（ReferenceQueue）在回收前收到通知，做资源清理（如 NIO 的 DirectBuffer）。**用对了引用类型，缓存更可控、也不容易 OOM。**

---

### 30. 类加载器的分类？类初始化触发时机？

**结论**：启动/扩展/应用类加载器；初始化发生在「首次主动使用」时。
**展开**：三层：Bootstrap（加载 JDK 核心如 java.lang）、Ext（扩展）、App（应用 classpath）。**初始化时机（主动引用）**：new、反射、调用静态方法/静态字段、初始化子类等；**被动引用不会触发初始化**（如通过子类访问父类静态字段、定义数组、引用常量）。**这也解释了双亲委派为什么能保证核心类不被替换。**

---

### 31. 逃逸分析 / 栈上分配？（加分）

**结论**：对象不逃逸就可能栈上分配，减少堆和 GC 压力。
**展开**：逃逸分析（`-XX:+DoEscapeAnalysis`）判断对象是否只在方法内使用，若不逃逸可以**栈上分配**、**标量替换**（拆成基本类型），不进堆、不用 GC。**这是 JVM 优化手段，答出来说明我理解虚拟机层面的优化，比只会背概念强。**

---

**Spring 补充**

### 32. Spring MVC 请求处理流程？【必答】

**结论**：DispatcherServlet → HandlerMapping 找 Handler → HandlerAdapter 执行 → 返回 ModelAndView → ViewResolver 渲染。
**展开**：请求先到前端控制器 DispatcherServlet，它通过 HandlerMapping 找到对应 Controller/Handler，再用 HandlerAdapter 适配执行；返回 ModelAndView 后，ViewResolver 解析出视图渲染。现在 REST 风格一般直接返回 JSON（@ResponseBody / @RestController）。**这是 Spring MVC 最常被问的流程，必须能连贯说下来。**

---

### 33. Spring 事务的底层原理？

**结论**：基于 AOP 动态代理 + 事务管理器，绑定到当前线程的连接。
**展开**：@Transactional 的方法会被代理，调用时由事务拦截器（TransactionInterceptor）开启事务，通过 PlatformTransactionManager 拿连接并把连接绑定到当前线程（ThreadLocal），方法正常提交、抛异常回滚。**这也解释了第 14 题里「自调用失效」的根本原因——没经过代理，事务拦截器根本没介入。**

---

### 34. Bean 的作用域？单例 Bean 线程安全吗？

**结论**：singleton（默认）、prototype、request、session；单例 Bean 本身不保证线程安全。
**展开**：singleton 单例、prototype 每次新建。**单例 Bean 如果有可变成员变量（如 Map、List），并发访问就不安全**；无状态 Bean 天然线程安全。**我一般把 Service 写成无状态，有状态数据放方法参数或缓存里，避免并发问题。**

---

### 35. @Autowired vs @Resource？

**结论**：@Autowired 按类型，@Resource 按名字。
**展开**：@Autowired 默认按类型注入，配 @Qualifier 指定名字；@Resource（JSR-250，JDK 提供）默认按名字。@Autowired 是 Spring 的，@Resource 是标准 Java 的、换容器更通用。**我习惯 @Autowired；若有同名歧义就用 @Qualifier 或 @Resource 指定。**

---

### 36. BeanFactoryPostProcessor vs BeanPostProcessor？

**结论**：一个改 Bean 定义（实例化前），一个改 Bean 实例（初始化前后）。
**展开**：BeanFactoryPostProcessor 作用于 BeanDefinition（如 @Configuration 处理配置占位符、注册 bean），发生在 Bean 实例化之前；BeanPostProcessor 作用于 Bean 实例（AOP 代理就在它的 postProcessAfterInitialization 里织入），在每次 Bean 初始化前后。**理解这个能说清「为什么 @Transactional 要用代理」「配置怎么被动态替换」。**

---

### 37. Spring Boot 配置文件加载顺序 / @SpringBootApplication 组成？

**结论**：profile 配置 > 外部 > classpath；@SpringBootApplication = 三个注解。
**展开**：配置优先级（后加载覆盖先加载）：命令行 > application-{profile} > application.yml > classpath 内。@SpringBootApplication 由 @SpringBootConfiguration（≈ @Configuration）、@EnableAutoConfiguration、@ComponentScan 组成。**排查「配置不生效」就是看优先级和覆盖关系。**

---

### 38. 微服务：Nacos 注册发现原理？网关 Gateway？

**结论**：Nacos 靠心跳保活 + 服务列表推送；网关做统一入口、路由、鉴权、限流。
**展开**：Nacos 客户端启动注册，靠**心跳**保活、断连剔除，还支持**配置推送**（客户端长轮询），既是注册中心又是配置中心；有临时/持久实例，也涉及 AP/CP 的取舍。**网关 Gateway** 是统一入口，做路由转发、鉴权、限流、灰度，比 Zuul 更轻量、反应式。**能说清「服务怎么被找到 + 流量怎么进来」就算过关。**
