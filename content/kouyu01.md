# 01 · Java 基础与并发（口语版）

> 每题 = 【结论】→ 展开 → 举例/取舍 →【追问备用】。
> 用「我主要看 / 我会优先 / 如果换场景」这类话，别背定义。

---

## 1. == 和 equals 的区别？

**结论**：== 比地址，equals 看怎么重写。
**展开**：== 对基本类型比的是值，对引用类型比的是内存地址；而 equals 默认也是比地址，但 String、Integer 重写成了比内容。所以像 `new String("a").equals("a")` 是 true。
**追问备用**：那重写 equals 要注意什么？—— 一定要重写 hashCode，否则放进 HashSet/HashMap 会乱。因为先比 hash 再比 equals，hash 不一致就认为不是同一个对象。

---

## 2. HashMap 原理？

**结论**：数组 + 链表 + 红黑树。
**展开**：先用 key 的 hash 算出数组下标，冲突就挂链表；当链表长度超过 8 且数组长度>=64 时转成红黑树，把查询从 O(n) 降到 O(log n)。默认负载因子 0.75，超过就扩容成 2 倍。
**取舍**：HashMap 线程不安全，并发场景我用 ConcurrentHashMap，而不是自己加锁。

---

## 3. ConcurrentHashMap 为什么线程安全？

**结论**：JDK8 用 CAS + synchronized 锁单个桶。
**展开**：它抛弃了 JDK7 的分段锁，改为对每个桶节点加锁。写入时如果桶为空就用 CAS 初始化，桶不为空就 synchronized 锁头节点；读操作不加锁，靠 volatile 保证可见性。所以并发度很高，不会锁整张表。

---

## 4. String / StringBuilder / StringBuffer？

**结论**：String 不可变，拼接用 StringBuilder，线程安全用 StringBuffer。
**展开**：String 每次拼接都会新建对象，循环里拼会浪费；StringBuilder 可变、非线程安全、性能好，日常够用；StringBuffer 加了 synchronized，线程安全但慢。我自己基本用 StringBuilder。

---

## 5. volatile 的作用？

**结论**：保证可见性 + 禁止指令重排。
**展开**：volatile 写会刷新到主内存，读从主内存拿，这样别的线程能看到最新值；同时通过内存屏障禁止重排序，像单例的双重检查锁定就要靠它防止「还没初始化完就被引用」。但它不保证原子性，比如 `i++` 还是可能出问题，那得用原子类或加锁。

---

## 6. JMM 内存模型？

**结论**：主内存 + 线程工作内存，靠 happens-before 保证有序。
**展开**：线程操作的是自己的工作内存副本，不是直接操作主内存，所以需要可见性。volatile/synchronized 能够建立 happens-before 关系，保证一个操作对另一个可见。这块不用背太细，能说清「为什么要有可见性、怎么解决」就行。

---

## 7. synchronized 原理与锁升级？

**结论**：基于对象头 Mark Word 的监视器锁，锁会「升级」。
**展开**：锁的状态有偏向锁、轻量级锁（CAS）、重量级锁（交给操作系统互斥量）。刚开始竞争不激烈时走偏向锁/轻量级，靠 CAS；竞争激烈才升级成重量级。**锁升级是不可逆的。**
**追问备用**：为什么升级不可逆？—— 因为升级成本高，一旦升级就不会再降回来（避免频繁切换）。

---

## 8. synchronized 和 ReentrantLock 的区别？

**结论**：ReentrantLock 更灵活。
**展开**：synchronized 是 JVM 层面的，简单；ReentrantLock 是 JUC 的，能中断、能设置公平锁、能有多个 Condition 条件队列、能用 tryLock 做非阻塞获取。但 ReentrantLock 要手动 unlock，一般放 finally，否则会死锁。两者都可重入。

---

## 9. AQS 原理？

**结论**：state 状态 + 双向等待队列，是 JUC 锁的地基。
**展开**：ReentrantLock、Semaphore、CountDownLatch 底层都是 AQS。它用一个 int 的 state 表示资源，用 CAS 去改；获取不到就把线程放到一个双向队列里等待。它的核心就是「原子改状态 + 队列排队」。

---

## 10. 线程池核心参数和执行流程？

**结论**：核心线程 → 队列 → 扩容到最大 → 拒绝策略。
**展开**：参数有 corePoolSize、maximumPoolSize、keepAliveTime、workQueue、threadFactory、handler。执行顺序是：先跑核心线程，满了丢进队列；队列满了再开线程到 maximumPoolSize；还满就触发拒绝策略。
**追问备用**：默认拒绝策略？—— AbortPolicy，抛 RejectedExecutionException；也可以改成 CallerRunsPolicy，由调用线程自己跑，起降级作用。

---

## 11. 为什么用线程池？

**结论**：复用线程、控制并发、防止资源耗尽。
**展开**：每次 new Thread 开销大，而且不加控制地并发会 OOM 或把 CPU 打满。线程池复用已创建的线程，同时用队列和上限控制并发数。这也是高并发系统的基本操作。

---

## 12. 线程池线程数怎么设？

**结论**：看是 IO 密集还是 CPU 密集。
**展开**：IO 密集（比如大量网络请求、读写数据库）可以设成 CPU 核数的 2 倍甚至更多，因为线程大部分时间在等待；CPU 密集就设成核数 + 1，避免太多线程来回切换。**但真实数量最好按压测调，不要拍脑袋。**

---

## 13. 信号量 Semaphore 是什么？【重点】

**结论**：控制同时能有多少个线程访问某资源，用来限流。
**展开**：我项目里用它来控制并发，acquire 拿一个许可、release 还一个。它能设公平，保证先来先得。它和 CountDownLatch 不一样：CountDownLatch 是「等一组线程都做完」然后放行一次；Semaphore 是「同一时间最多 N 个在跑」，可以反复用。
**【结合项目】**：类似我病房/问诊这类有资源上限的场景，适合用信号量做并发保护，避免同时太多访问把系统或外部模型压垮。

---

## 14. CountDownLatch vs CyclicBarrier？

**结论**：CountDownLatch 等别人完成，一次性；CyclicBarrier 大家互相等，可复用。
**展开**：CountDownLatch 是一个/多个线程等 N 个线程 countDown 完再继续，用完就没了；CyclicBarrier 是一组线程到齐再一起走，可以 reset 复用。场景上，CountDownLatch 更像「主线程等所有子任务完成」，CyclicBarrier 更像「并行步骤对齐」。

---

## 15. 原子类 / CAS？

**结论**：用 CAS 自旋实现原子更新，不用锁。
**展开**：AtomicInteger 的 incrementAndGet 底层是「比较再交换」，先读旧值、算新值、再 CAS 比较，只要内存值和预期一致就更新，否则重试。优点是无锁、性能高；缺点是自旋在竞争激烈时会空转，还有 ABA 问题。**ABA 可以用 AtomicStampedReference 加版本号解决。**

---

## 16. ThreadLocal 与内存泄漏？

**结论**：每个线程有自己的副本，用完要 remove，否则可能内存泄漏。
**展开**：ThreadLocal 让每个线程持有独立变量，互不干扰，比如存 traceId、用户上下文。它的内部 Map 的 key 是弱引用，value 是强引用；如果是线程池复用线程，value 一直留着，就可能泄漏。所以我用完会主动 remove。

---

## 17. 虚拟线程？（JDK 21，你的亮点）

**结论**：JDK 21 的轻量级线程，JVM 调度，适合 IO 密集高并发。
**展开**：传统「一个请求一个线程」模型，在大量 IO 等待时，放了很多线程在空等，浪费资源；而且 OS 线程数量有限。虚拟线程由 JVM 管理，一个平台线程可以承载成千上万个虚拟线程，成本低、能扛高并发。它特别适合大量阻塞在 IO 上的场景，比如我的流式对话、发消息这种。
**取舍**：它替代的是「线程池的并发模型」，但不是万能——如果是 CPU 密集计算，虚拟线程没有增益，还是得靠并行和优化。对我来说，用虚拟线程可以让写并发代码更简单、吞吐更高。

---

## 补充 · 高频但原文档未覆盖（按常考顺序）

### 18. 线程创建方式与生命周期？

**结论**：三种创建 + 六种状态。
**展开**：① 继承 Thread；② 实现 Runnable；③ 实现 Callable + FutureTask（能拿返回值、能抛异常）。实际我基本用线程池 + Callable，不直接 new Thread。状态有 NEW、RUNNABLE、BLOCKED、WAITING、TIMED_WAITING、TERMINATED；阻塞是在等锁，等待是 wait/join 挂起。
**追问备用**：Callable 和 Runnable 区别？——Runnable 的 run 无返回值、不抛异常；Callable 的 call 有返回值、能抛异常，配 Future 拿结果。

### 19. sleep 和 wait 的区别？为什么 wait 要在 synchronized 里？

**结论**：sleep 不释放锁，wait 释放锁，且必须在同步块里。
**展开**：sleep 是 Thread 的静态方法，只是让当前线程暂停，不释放锁；wait 是 Object 的方法，会释放锁并进入等待队列，得用 notify/notifyAll 唤醒。wait 必须在 synchronized 里，因为要先拿到对象监视器才能进等待队列，否则抛 IllegalMonitorStateException。
**追问备用**：notify 和 notifyAll？——notify 随机唤醒一个，notifyAll 唤醒全部；我一般用 notifyAll，避免丢唤醒。

### 20. 死锁怎么产生、怎么避免？

**结论**：多个线程互相等对方持有的锁，形成循环等待。
**展开**：四个必要条件：互斥、持有并等待、不可剥夺、循环等待。避免方法：① 按固定顺序加锁（先 A 后 B）；② 用 tryLock + 超时而不是死等；③ 减小锁粒度、用无锁结构。**我优先「顺序加锁」加「超时」，这是最有效的。**
**追问备用**：怎么定位？——jstack 会输出 Found one Java-level deadlock，看线程栈里 pending 的锁就能发现。

### 21. CompletableFuture？（你的亮点，异步/流式场景）

**结论**：用回调 + 编排替代「手动 Future.get 阻塞」，做并行/串行/异常处理。
**展开**：我把多个独立异步任务并行跑：thenCombine 合并结果、thenApply 串行转换、exceptionally/handle 降级。比 CountDownLatch 更优雅，不阻塞主线程，能链式表达「哪个任务等哪个」。**会指定自定义 executor，避免默认 ForkJoinPool 被阻塞任务占满。**
**取舍**：如果只是「开个线程异步执行」，用线程池 execute 就够了；一旦要多个任务组合、拿结果、设超时，就用 CompletableFuture。
**【结合项目】**：AI 流式里多个模型/工具调用可以并行，再用 CompletableFuture 编排、超时和降级，吞吐和响应速度都更好。

### 22. 线程池背后的队列 BlockingQueue？

**结论**：corePoolSize 满了先进队列；不同队列决定线程池行为。
**展开**：ArrayBlockingQueue 有界、可设公平；LinkedBlockingQueue 默认无界（注意 OOM 风险）；SynchronousQueue 不存任务、来一个直接交给线程，newCachedThreadPool 就用它；DelayQueue 按延迟时间取。**我自定义线程池会选有界队列 + 明确拒绝策略，避免无界队列打爆内存。**
**追问备用**：为什么不用 Executors 快捷方法？——FixedThreadPool/CachedThreadPool 用无界队列，可能 OOM；官方也建议用 ThreadPoolExecutor 自己传参。

### 23. ArrayList vs LinkedList？集合框架怎么答？

**结论**：ArrayList 是数组、随机访问快；LinkedList 是双向链表、头尾增删快。
**展开**：ArrayList 底层数组，按索引 get 是 O(1)，中间插入/删除要搬元素；LinkedList 双向链表，头尾 add/remove 是 O(1)，但中间访问要遍历，且每个节点有额外对象开销。**实际我基本用 ArrayList，除非高频头尾增删才考虑 LinkedList。**
**展开（集合框架）**：List 有序可重复、Set 去重、Map 是键值；线程安全版就是 Vector / Collections.synchronizedXxx / CopyOnWriteArrayList / ConcurrentHashMap。
**追问备用**：fail-fast 是什么？——ArrayList 迭代时 modCount 变了会抛 ConcurrentModificationException；CopyOnWriteArrayList 迭代时是快照，不抛。

### 24. String 常量池 / intern()？Integer 缓存？

**结论**：字符串字面量进池，intern 可手动入池；Integer 有 -128~127 缓存。
**展开**：`String a="a"; String b="a"; a==b` 是 true，因为都指向常量池；`new String("a")` 是堆上新对象，== 是 false，intern() 会去池里找、找不到再放入。Integer、Long 这类包装类有 -128~127 缓存，`Integer a=100; Integer b=100; a==b` 为 true，超过 127 就是 false。**所以比较包装类用 equals，别用 ==。**
**追问备用**：为什么 String 设计成不可变？——可做缓存、hashCode 可缓存、天然线程安全、能复用常量池。

### 25. final 关键字？

**结论**：修饰变量/方法/类，分别表示不可变、不可重写、不可继承。
**展开**：final 变量引用不可变，但对象内容可变；final 方法不能被重写（常配合模板方法）；final 类不能被继承（如 String）。**配合不可变对象能天然线程安全，省去加锁。**

### 26. Java 8 新特性？（lambda / Stream / Optional）

**结论**：lambda + Stream + Optional + 默认方法，让代码更简洁、偏函数式。
**展开**：lambda 本质是函数式接口的匿名实现；Stream 做集合的过滤/映射/聚合，惰性求值、内部迭代；Optional 显式处理「可能为空」，避免 NPE；接口默认方法解决集合 API 兼容。
**取舍**：我会优先用 Stream 处理集合，但别过度——逻辑复杂还硬写成一行流，反而难读。

### 27. 异常体系？（checked vs unchecked / try-with-resources）

**结论**：Error + Exception，受检异常要 try-catch 或 throws，非受检不用。
**展开**：RuntimeException（NPE、越界）是非受检；IOException 这类受检异常编译器强制处理。finally 一定会执行，但如果 finally 里 return 会覆盖前面返回值且吞掉异常。**try-with-resources 能自动关资源，比 finally 优雅，文件流、连接我都用它。**

### 28. 接口 vs 抽象类？重载 vs 重写？

**结论**：接口是「能力契约」，抽象类是「模板骨架」；重载看参数，重写看继承。
**展开**：接口强调 has-a/能力，一个类可实现多个接口；抽象类强调 is-a/公共状态，单继承。重载是同名方法、参数不同，编译期决定；重写是子类覆盖父类方法，运行期多态。
**取舍**：能用组合/接口就用接口；需要共享状态模板才用抽象类。

### 29. HashMap 高频追问（为什么 2 的幂 / 阈值 8 / 0.75）

**结论**：2 的幂让 `(n-1)&hash` 代替取模，更快且分布更均匀；转红黑树是查询与维护的权衡；0.75 是空间与碰撞的折中。
**展开**：容量是 2 的幂，`hash & (n-1)` 等价于取模；容量翻倍时只需看 hash 新增的那一位是 0 还是 1，扩容不用重算所有下标。链表转红黑树阈值 8 是结合泊松分布，链表过长红黑树 O(log n) 更优；再退化回链表阈值 6，避免频繁转换。负载因子 0.75 是平衡「碰撞概率」和「空间浪费」的经验值。
**追问备用**：为什么不用平衡树？——树节点占内存大，只有链表足够长才值得换。