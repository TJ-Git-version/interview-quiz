# 八股文高频问答清单

> 用法：每个问答先自己默想起来，再对照答案。答案尽量「短、准、能说出口」，面试官追问再展开。
> 标记【重点】的是根据你项目/岗位大概率被问到的。

---

# 一、Java 基础

**1. == 和 equals 的区别？**
== 比较内存地址（基本类型比较值）；equals 默认也是地址比较，但 String 等重写后比较内容。重写 equals 必须重写 hashCode。

**2. HashMap 原理？**
数组+链表+红黑树。key 的 hash 求下标，冲突挂链表，长度>8 且数组>=64 转红黑树。默认负载因子 0.75，扩容 2 倍。非线程安全。

**3. HashMap 为什么线程不安全？**
并发 put 可能覆盖、扩容时数据丢失、JDK7 头插法可能成环。用 ConcurrentHashMap。

**4. ConcurrentHashMap 原理？**
JDK8 是 CAS + synchronized 锁桶（节点），取消分段锁；读不加锁用 volatile；put 用 CAS 初始化 + synchronized 锁头节点。

**5. String、StringBuilder、StringBuffer 区别？**
String 不可变；StringBuilder 可变非线程安全；StringBuffer 可变线程安全（synchronized）。拼接用 StringBuilder。

**6. ArrayList vs LinkedList？**
ArrayList 数组，随机访问 O(1)，中间插入删除 O(n)；LinkedList 双向链表，头尾插入删除 O(1)，随机访问 O(n)。日常优先 ArrayList。

**7. 接口和抽象类区别？**
抽象类可含实现和成员变量，单继承；接口多实现，侧重行为契约。JDK8 后接口可 default 方法。

**8. 异常体系？**
Throwable 分 Error 和 Exception；Exception 分受检（RuntimeException 之外的，必须处理）和非受检（RuntimeException）。try-catch-finally；try-with-resources 自动关闭。

---

# 二、Java 并发（重点）

**9. volatile 作用与原理？**
保证可见性（写会刷新主存、读从主存读）、禁止指令重排（内存屏障）。不保证原子性。用状态标志、单例双重检查。

**10. JMM 内存模型？**
主内存 + 工作内存；线程间通过主内存传递变量。可见性靠 volatile/synchronized，有序性靠 happens-before。

**11. synchronized 原理与锁升级？**
基于对象头 Mark Word 的监视器锁。无锁→偏向锁→轻量级锁（CAS）→重量级锁（OS 互斥量）。锁升级不可逆。

**12. synchronized 和 ReentrantLock 区别？**
ReentrantLock 更灵活：可中断、可设置公平锁、多个 Condition 条件队列、tryLock 非阻塞；需手动 unlock。都是可重入。

**13. AQS 原理？**
AbstractQueuedSynchronizer 用 state + 双向等待队列（CLH 变体）。ReentrantLock/Semaphore/CountDownLatch 都基于它。获取资源用 CAS 改 state，失败入队自旋/阻塞。

**14. 线程池核心参数？**
corePoolSize、maximumPoolSize、keepAliveTime、unit、workQueue、threadFactory、handler。**执行流程**：先跑核心线程，满了进队列，队列满了再开线程到最大，还满则走拒绝策略。

**15. 为什么用线程池？**
复用线程、控制并发、方便管理。创建线程开销大，无上限并发会 OOM/资源耗尽。

**16. 四种拒绝策略？**
AbortPolicy（抛异常，默认）、CallerRunsPolicy（调用者线程执行）、DiscardPolicy（丢弃）、DiscardOldestPolicy（丢最旧）。

**17. 线程池线程数怎么设置？**
IO 密集：CPU 核数 * 2（或更多，因为阻塞多）；CPU 密集：CPU 核数 + 1。实际按压测调优。

**18. 信号量 Semaphore？【重点，你简历有】**
控制同时访问资源的线程数（限流）。acquire/release；可设公平。和 CountDownLatch（等一组线程完成）区别：Semaphore 是控制并发量，多线程可多次。

**19. CountDownLatch vs CyclicBarrier？**
CountDownLatch：一个/多个线程等 N 个线程完成，一次性不可复用。CyclicBarrier：一组线程互相等待到齐，可复用。

**20. 原子类 / CAS？**
AtomicInteger 等用 Unsafe 的 CAS（比较并交换）自旋实现原子更新。ABA 问题用 AtomicStampedReference（版本号）。

**21. ThreadLocal 是什么？内存泄漏？**
每个线程独立的变量副本，用 ThreadLocalMap。key 是弱引用，value 是强引用，线程池复用会残留 → 用完 remove()，否则可能内存泄漏。

**22. 虚拟线程？【重点，JDK21 你简历有】**
JDK 21 的轻量级线程，由 JVM 调度，不依赖 OS 线程，一个平台线程可承载大量虚拟线程。适合 IO 密集、高并发。传统线程池「一个请求一个线程」在大量 IO 等待时浪费，虚拟线程可更低成本高并发。能替代部分线程池场景，但 CPU 密集无增益。

---

# 三、JVM（重点）

**23. 内存区域？**
堆（对象、GC 主战场）、虚拟机栈（方法栈帧）、本地方法栈、方法区（JDK8 元空间 Metaspace）、程序计数器。线程共享：堆+方法区；线程私有：栈、PC。

**24. 对象创建过程？**
类加载检查 → 分配内存（指针碰撞/空闲列表）→ 初始化零值 → 设置对象头 → 执行构造方法。

**25. 类加载机制 / 双亲委派？**
加载→验证→准备→解析→初始化。双亲委派：先让父加载器加载，父不加载才自己加载，保证类唯一性和安全（防止自定义 java.lang.String）。破坏场景：SPI、Tomcat 等。

**26. GC 算法？**
标记-清除（碎片）、标记-复制（新生代）、标记-整理（老年代）。分代：新生代（Eden+2Survivor）用复制，老年代用标记-整理。

**27. 常见收集器？**
CMS（老年代，并发标记清除，有碎片、停顿低）、G1（Region 化，可预测停顿，默认 JDK9+）、ZGC（超低停顿，染色指针）。

**28. 怎么判断对象可回收？**
可达性分析（GC Roots）。引用计数无法解决循环引用。GC Roots：虚拟机栈引用、静态变量、常量、JNI 引用等。

**29. OOM / 内存泄漏怎么排查？【重点，你简历有】**
① jps/jstack 看线程 ② jmap 导出堆 dump ③ MAT/JVisualVM 分析大对象、引用链 ④ 看是否线程池缓存、缓存无界、流未关 ⑤ 定位根因后修代码/调参。Arthas 可在线排查（heap/histogram/thread）。

**30. 频繁 Full GC 怎么排查？**
看 GC 日志（-Xlog:gc）、监控堆占用；原因多为大对象、内存泄漏、元空间满、堆过小；用 jstat/gc 观察频率与回收量。

**31. 参数调优思路？**
先定位（是 CPU、内存还是 GC），再针对性调 Xms/Xmx、新生代比例、收集器选择、GC 停顿 vs 吞吐权衡。**记得强调：先监控再调，不盲目。**

---

# 四、Spring 全家桶（重点）

**32. IOC 是什么？**
控制反转：把对象创建和依赖管理的控制权交给容器，解耦。通过 DI 依赖注入实现。

**33. Bean 生命周期？**
实例化 → 属性填充（依赖注入）→ Aware → BeanPostProcessor 前置 → 初始化（@PostConstruct/InitializingBean） → BeanPostProcessor 后置 → 使用 → 销毁（@PreDestroy/DisposableBean）。代理增强发生在 BeanPostProcessor 后置。

**34. 循环依赖怎么解决？**
三级缓存：singletonObjects（已完成）、earlySingletonObjects（早期曝光）、singletonFactories（工厂）。A 创建时把工厂放入三级缓存，B 引用 A 时提前暴露。构造器循环依赖无法解决（因为还没实例化）。

**35. AOP 原理？**
动态代理：JDK 代理（实现接口）用 Proxy + InvocationHandler；CGLIB 代理（子类，无接口）用字节码生成。Spring 默认有接口用 JDK，否则 CGLIB。切面=切点+通知（前置/后置/环绕/异常/返回）。

**36. Spring 事务传播行为？**
REQUIRED（默认，有则加入，无则新建）、REQUIRES_NEW（新建，挂起当前）、NESTED（嵌套，有保存点）、SUPPORTS、MANDATORY、NOT_SUPPORTED、NEVER。

**37. 事务失效场景？【重点】**
① 非 public 方法 ② 同类内自调用（不走代理） ③ 异常被 try-catch 吃掉 ④ 方法非由代理对象调用 ⑤ 类未被 Spring 管理 ⑥ 多线程（事务不跨线程） ⑦ 传播行为配置错。

**38. Spring Boot 自动配置原理？**
@SpringBootApplication 内含 @EnableAutoConfiguration，通过 @Import 导入 AutoConfigurationImportSelector，读取 META-INF/spring.factories（或 AutoConfiguration.imports）里的配置类，按 @ConditionalOnClass/@ConditionalOnMissingBean 等条件生效。

**39. starter 是什么？**
一组自动配置 + 依赖的封装，引入即用（如 spring-boot-starter-web）。自定义 starter = 写自动配置类 + 注册到 imports。

**40. Spring Cloud Alibaba 主要组件？**
Nacos（注册+配置中心）、Sentinel（限流/熔断/降级）、Seata（分布式事务）。Dubbo（RPC）。

**41. Sentinel 限流/熔断原理？**
基于滑动窗口/令牌桶做流控；对慢调用比例、异常比例/数做熔断；提供降级（fallback）。资源维度（QPS/线程数）。

**42. Seata 分布式事务方案？**
AT（自动，两阶段+全局锁，性能好，适合大多场景）、TCC（手动 try-confirm-cancel，强一致、侵入高）、SAGA（长事务、最终一致）、XA（数据库级，性能差）。选型看一致性要求和性能。

---

# 五、WebFlux / Project Reactor / SSE（重点，你项目核心）

**43. 响应式编程是什么？**
基于事件驱动 + 非阻塞，用少量线程处理海量并发请求。数据流（Flux/Mono）支持异步、背压。

**44. WebFlux vs WebMVC？**
WebMVC 是 Servlet 同步阻塞（一请求一线程）；WebFlux 基于 Reactor + Netty 非阻塞，少量线程高并发，适合 IO 密集。WebFlux 里不要做阻塞 IO（如 JDBC 同步），会阻塞事件循环。

**45. Mono / Flux 区别？**
Mono 0-1 个元素；Flux 0-N 个元素。都是 Publisher。

**46. 背压 backpressure？**
下游处理能力不足时，通过需求信号（request(n)）控制上游生产速度，防止压垮下游。

**47. SSE 和 WebSocket 区别？【重点，必答】**
SSE（Server-Sent Events）：**单向**服务端→客户端，基于 HTTP，自动重连、协议简单、兼容性好，**只适合服务端持续推送**（如 AI 流式文本）。
WebSocket：**双向**全双工，基于 TCP 长连接，适合需要客户端也持续发送的场景（如聊天、游戏）。
选型：AI 流式输出主要服务端→客户端推送 → **用 SSE 更简单、天然走 HTTP、自动重连**；若需客户端实时发消息（如协作/聊天）则 WebSocket。

**48. WebFlux 做 SSE 的实现？**
返回 Flux<T>（如 Flux<ServerSentEvent>），Controller 用 text/event-stream，框架自动按 SSE 推送每个元素。

**49. 响应式里阻塞调用有什么坑？**
在 reactor 线程里调同步 JDBC/Thread.sleep 会阻塞事件循环，导致整体吞吐下降。应改用异步/响应式驱动（R2DBC）或放到边界调度器。

---

# 六、MySQL（重点）

**50. B+ 树为什么适合索引？**
多叉树矮胖、减少 IO 次数；叶子有序链表便于范围查询；叶子存数据/指针。对比 B 树：B+ 非叶子不存数据、更矮、范围查询快。

**51. 聚簇索引 vs 二级索引？**
聚簇索引（主键）：B+ 树叶子直接存数据行，一个表一个。二级索引叶子存主键值，查询需回表（除非覆盖索引）。InnoDB 主键尽量自增，避免页分裂。

**52. 覆盖索引？**
查询列都在索引里，无需回表，通过 Explain 的 Extra=Using index 判断。

**53. 索引失效场景？**
对索引列做函数/运算、隐式类型转换、前导模糊查询 %xx、OR 连接非索引、联合索引不满足最左前缀、使用 != 或 not in、优化器认为全表更好。

**54. explain 怎么看？**
type（all<index<range<ref<eq_ref<const，越左越差）、key（用的索引）、rows（扫描行数）、Extra（Using filesort/Using temporary 要优化、Using index 覆盖索引）。

**55. 事务隔离级别？**
读未提交、读已提交、可重复读（MySQL 默认）、串行化。**可重复读**通过 MVCC + 间隙锁解决幻读（快照读用 MVCC，当前读用锁）。

**56. MVCC 原理？**
每行有隐藏列 trx_id、roll_pointer；通过 Read View（活跃事务列表）+ undo log 版本链实现快照读，按可见性判断看哪个版本。

**57. 幻读怎么解决？**
可重复读下，快照读（普通 select）通过 MVCC；当前读（for update、update、insert）通过**间隙锁/临键锁**锁定范围，防止插入。

**58. 锁的类型？**
表锁、行锁（记录锁/间隙锁/临键锁）、意向锁；乐观锁（版本号）vs 悲观锁（select for update）。InnoDB 行锁基于索引，无索引会锁表。

**59. 慢 SQL 怎么优化？【重点，你简历有】**
① 定位：慢查询日志打开 + explain 分析 ② 常见问题：缺索引、索引失效、深分页、select *、大表全扫、连接过多 ③ 优化：加/改索引、覆盖索引、改写 SQL（避免 select *、用合适分页）、拆大事务、大字段分离 ④ 验证：看执行计划和实际耗时。**能讲「定位→定位到哪→怎么改→效果」**。

**60. 深分页优化？**
用 id > 上一页最大 id 的游标方式（where id > ? limit ?），或延迟关联（先查主键再回表），避免 offset 过大。

**61. 连接池参数？**
核心：maxActive/maxPoolSize、maxIdle、minIdle、maxWait、连接超时。调优要看并发和峰值，避免连接耗尽/超时。Druid/HikariCP 常见。

**62. 分库分表？**
数据量大或单表瓶颈时。水平（按字段 hash/range 分表）、垂直（按业务拆库）。问题：跨库事务、全局 ID（雪花）、分布式查询、路由。通常先优化索引和读写分离，不轻易分表。

---

# 七、Redis / Redisson（重点）

**63. Redis 为什么快？**
内存操作、单线程（避免上下文切换和锁竞争）、IO 多路复用（epoll）、高效数据结构。

**64. 常用数据结构及应用？**
String（缓存/计数/分布式锁）、Hash（对象）、List（队列/消息）、Set（去重/共同好友）、ZSet（排行榜/延迟）。你项目：在线用户、房间成员、会话缓存。

**65. Redis 为什么单线程还这么快？**
单线程处理命令，用 IO 多路复用处理连接；内存快；但要注意大 key、慢命令会阻塞。

**66. 持久化 RDB vs AOF？**
RDB：定时快照，文件小、恢复快，但可能丢最后一次数据。AOF：追加写命令，数据更完整、可配置 fsync，文件大。可混合持久化（RDB 做基 + AOF 增量）。生产一般 AOF everysec 或混合。

**67. 缓存穿透 / 击穿 / 雪崩？【重点，必答】**
- **穿透**：查不存在的 key，一直被压到 DB → 布隆过滤器 / 空值缓存（短 TTL）。
- **击穿**：某个热点 key 过期，大量请求同时打到 DB → 互斥锁（只让一个重建）/ 逻辑过期（不主动删，后台重建）。
- **雪崩**：大量 key 同时过期或 Redis 宕机 → 过期时间随机化、多级缓存、高可用（哨兵/集群）、限流降级。

**68. 缓存一致性方案？**
旁路缓存：先更新 DB，再删缓存。延迟双删（删→等→删）或订阅 binlog（Canal）异步删。高并发用「先更新 DB + 删缓存」，可接受短暂不一致；强一致用锁/版本号，成本高。

**69. 分布式锁实现？【重点】**
setnx + 过期时间 + 唯一 value（防误删）+ Lua 原子校验删除。**问题**：锁过期没执行完会误删/并发；主从切换可能丢锁。**Redisson** 解决：可重入、看门狗自动续期（watchdog）、公平锁。高可靠场景用 RedLock 或 ZooKeeper/etcd。

**70. Redisson 看门狗？**
加锁后默认 30s，后台定时续期，业务没执行完不释放；公平锁用队列保证先来先得（你项目问诊需要）。锁粒度按「房间/一次问诊」收敛，减少冲突。

**71. Redisson vs Redis setnx 锁？**
Redisson：可重入、自动续期、公平/读写锁、lua 保证原子，功能全；setnx 简单但功能弱、需自己处理续期和误删。生产一般用 Redisson。

**72. big key / 热 key 怎么处理？**
big key：拆分、避免大集合、用 hash 分片；热 key：本地缓存、多副本、限流、读写分离。

---

# 八、RabbitMQ（次重点）

**73. RabbitMQ 工作模型？**
生产者→交换机→绑定→队列→消费者。交换机：direct（精确路由）、topic（通配）、fanout（广播）、headers。

**74. 消息可靠性怎么保证？【重点】**
① 生产端：confirm 确认 + 事务 ② MQ 端：交换机/队列/消息持久化 ③ 消费端：手动 ack + 幂等（唯一 ID/状态）。三者配合保证不丢。

**75. 消息重复消费怎么办（幂等）？**
消费端用唯一业务 ID 去重（Redis setnx 或 DB 唯一键/状态）、或消息表记录已处理。保证「处理一次」的幂等。

**76. 死信队列 / 延迟队列？**
消息被拒绝、过期、队列满 → 进入死信（DLX）。延迟队列：用 TTL + 死信或插件，实现延迟执行。

**77. 消息堆积怎么处理？**
加消费者/扩容、优化消费逻辑、批量拉取、降级丢弃或转异步/落库。生产要监控积压量。

---

# 九、计算机网络 / 操作系统（次重点）

**78. TCP 三次握手？为什么不是两次？**
SYN→SYN+ACK→ACK。两次无法确认双方收发能力、无法防止历史连接导致资源浪费，三次能同步序列号、确认双方收发正常。

**79. 四次挥手？为什么四次？**
FIN→ACK→FIN→ACK。因为 TCP 半关闭，一方发 FIN 只表示自己不发了，还要等对方也发 FIN，所以分两次关闭。

**80. HTTP 1.1 / 2 / 3 区别？**
1.1 长连接、流水线（有队头阻塞）；2 多路复用、二进制帧、头部压缩、服务端推送（解决队头阻塞）；3 基于 QUIC（UDP）、更低延迟、0-RTT、连接迁移。

**81. TCP 和 UDP 区别？**
TCP 可靠、面向连接、有序、流量控制、拥塞控制；UDP 无连接、不可靠、低延迟，适合实时（音视频/DNS）。

**82. 进程与线程？**
进程是资源分配单位，线程是 CPU 调度单位；一个进程多线程共享地址空间。用户态/内核态切换开销。select/poll/epoll：epoll 用事件驱动、O(1)，适合高并发（Netty/WebFlux 底层）。

---

# 十、大模型 / Spring AI / RAG / Agent（大模型岗重点）

**83. 大模型怎么工作（简讲）？**
基于 Transformer 的神经网络，预测下一个 token；输入被分词（tokenize）成 token，经 embedding 向量化、注意力机制建模上下文，自回归生成。**关键概念**：上下文窗口（能接受的 token 上限）、温度（随机性）、思维链（CoT，让模型逐步推理）。

**84. 什么是 token？Embedding？**
token 是模型的最小处理单元（词/子词）；Embedding 把文本映射成高维向量，语义相近向量相近。Embedding 用于 RAG 检索、相似度。

**85. Spring AI 的 ChatClient / ChatModel / Advisor / ToolCallback？**
- ChatModel：底层模型调用抽象（不同模型统一接口）。
- ChatClient：更高层、流式（fluent API），封装 prompt/参数。
- Advisor：在请求前后做增强（如记忆、RAG、日志、结构化输出）。
- ToolCallback：把工具/函数作为工具暴露给模型（Function Calling）。
统一抽象让业务层不依赖具体厂商（通义/OpenAI 可切）。

**86. 怎么实现流式输出（SSE）？**
用 ChatModel 的 stream（返回 Flux），Controller 返回 text/event-stream；服务端逐 token 推给前端。WebFlux + SSE 实现，注意别阻塞。

**87. ChatMemory 对话记忆？**
存多轮会话历史，支持持久化（DB/Redis）；要控制 token 上限，超长做压缩/截断/摘要，避免上下文爆炸。

**88. RAG 完整流程？【重点，必答】**
文档解析（PDF/DOCX/TXT）→ 清洗/分块 → embedding 向量化 → 入库（向量库）→ 检索（Top-K）→ 重排（可选）→ 拼 prompt → 生成（增强生成）→ 带引用输出。

**89. 怎么降幻觉？【重点，必答，结合你项目】**
① 检索质量：多路召回（向量+关键词+查询改写/扩展）提高命中 ② 重排（rerank）提精度 ③ 提示词强约束「只依据检索结果回答、可拒答」 ④ 溯源引用（reference）让回答可查 ⑤ 无检索结果时明确拒答 ⑥ 异常/低置信度降级提示 ⑦ 知识库质量治理（去重、时效）。

**90. 分块 chunking 怎么做好？**
重叠滑窗（保证上下文衔接）、按语义/标题分块、块大小与检索精度权衡；太小丢失上下文、太大噪声多。

**91. 向量库选型？【重点】**
pgvector（复用 Postgres、运维简单、和业务数据同库，量小够用）、Milvus（大规模、高性能、专为向量）、Redis Vector（快、简单、量小）、Elasticsearch（全文+向量混合）。选型看数据量、召回精度、运维成本。

**92. 为什么用 pgvector？**
你项目复用了 Postgres 生态，免去单独维护向量库；对教学知识库量级「够用」；量大可平滑迁 Milvus。**强调基于实际规模做取舍**。

**93. Agent 是什么？有哪些模式？**
Agent = 大模型 + 工具 + 规划 + 记忆 + 循环执行。ReAct（推理+行动交替）、Plan-Execute（先计划再执行）、状态机编排（显式定义状态流转，可控可续）。你项目 PPT 生成用状态机，深度研究用 Plan-Execute。

**94. 多智能体怎么协作？**
拆分为多个专职 Agent，各自负责场景（如临床思维、备课、循证），通过编排层调度 + 统一消息协议（thinking/text/reference/recommend）通信，可串行/并行，避免上下文爆炸、便于独立迭代。

**95. MCP / Function Calling？**
Function Calling：模型输出「调用某个工具」的结构化请求，应用执行后把结果回填。MCP（Model Context Protocol）：统一模型与外部工具/数据源的标准协议（你项目 MCP 接 Tavily 做搜索），让工具接入标准化、可复用。

**96. Prompt 工程？**
角色扮演、Few-shot 示例、结构化 JSON 输出约束、上下文压缩、系统提示词设计。**效果评估**：评测集 + 人工/自动打分（你项目结构化评分），A/B 对比，看准确率/幻觉率/首字延迟。

**97. 大模型工程的稳定性问题？**
幻觉、工具调用失败（做有限重试）、超时/延迟（首字优化）、成本（token 计费、模型选型）、并发/限流（多用户同时调用）、上下文超限（压缩/分片）。

**98. 怎么评价一个大模型应用的好坏？**
业务指标（准确率、用户满意度、任务完成率）+ 工程指标（首字延迟、总耗时、成本、失败率、幻觉率）+ 可解释性（引用溯源）。

---

# 附：容易被「再追问一层」的坑

1. 说 Bloom 过滤器 → 被问「误判怎么办」→ 答允许少量误判，可用多哈希降低。
2. 说 Redisson 锁 → 被问「锁过期了业务没执行完」→ 看门狗续期；「主从切换丢锁」→ RedLock/etcd。
3. 说 SSE → 被问「断线怎么办」→ 自动重连 + lastEventId 续传。
4. 说 RAG → 被问「为什么有幻觉还不用」→ 强调多路召回+引用约束+拒答兜底，承认无法 100% 消除但可控可用。
5. 说「技术负责人」→ 被问「团队几个人」→ 坦诚小团队从 0 到 1 全链路，用结果说话。
6. 说缓存命中 95% → 被问「怎么保证不出错/一致性」→ 讲清更新策略和可接受的短暂不一致。

> 复习节奏：先过一遍能说出来 → 反复默写高频 → 模拟面试让对方随意追问，答不出的补进这份清单。
