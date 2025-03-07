const logger = require('./logger');
const delay = require('./delay');

class HumanBehavior {
    #userAgents;
    #gpuVendors;
    #timezones;
    #languages;
    #fonts;
    #plugins;
    #browserBehaviors;

    constructor() {
        this.minDelay = 500;
        this.maxDelay = 2000;
        this.typeMinDelay = 50;
        this.typeMaxDelay = 200;
    }

    // Private helper methods
    #getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    #getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    #getRandomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    #getRandomPoint(maxX, maxY) {
        return {
            x: this.#getRandomInt(0, maxX),
            y: this.#getRandomInt(0, maxY)
        };
    }

    // 贝塞尔曲线计算辅助方法
    #bezierCurve(p0, p1, p2, p3, t) {
        const cx = 3 * (p1.x - p0.x);
        const bx = 3 * (p2.x - p1.x) - cx;
        const ax = p3.x - p0.x - cx - bx;
        const cy = 3 * (p1.y - p0.y);
        const by = 3 * (p2.y - p1.y) - cy;
        const ay = p3.y - p0.y - cy - by;
    
        const tCubed = t * t * t;
        const tSquared = t * t;
    
        const x = ax * tCubed + bx * tSquared + cx * t + p0.x;
        const y = ay * tCubed + by * tSquared + cy * t + p0.y;
        
        return { x, y };
    }

    /**
     * 模拟人类行为
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {Object} options 配置选项
     * @param {number} options.duration 模拟行为持续时间（毫秒），默认5000ms
     * @param {number} options.movements 鼠标移动次数，默认3-7次
     */
    async simulateHumanBehavior(page, options = {}) {
        const duration = options.duration || 5000;
        const movements = this.#getRandomInt(3, options.movements || 7);

        try {
            // 获取页面尺寸
            const dimensions = await page.evaluate(() => {
                return {
                    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
                    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
                };
            });

            logger.info(`开始模拟人类行为，计划移动 ${movements} 次`);

            // 执行随机鼠标移动
            for (let i = 0; i < movements; i++) {
                const point = this.#getRandomPoint(dimensions.width, dimensions.height);
                
                // 移动鼠标到随机位置
                await page.mouse.move(point.x, point.y);
                logger.debug(`鼠标移动到位置: (${point.x}, ${point.y})`);

                // 随机停留一段时间
                const waitTime = this.#getRandomInt(this.minDelay, this.maxDelay);
                await delay(waitTime);

                // 有25%的概率执行滚动
                if (Math.random() < 0.25) {
                    const scrollY = this.#getRandomInt(-300, 300);
                    await page.evaluate((y) => {
                        window.scrollBy(0, y);
                    }, scrollY);
                    logger.debug(`页面滚动: ${scrollY}px`);
                }
            }

            // 最后的随机停留
            const finalDelay = this.#getRandomInt(this.minDelay, this.maxDelay);
            await delay(finalDelay);

            logger.info('人类行为模拟完成');
        } catch (error) {
            logger.error('模拟人类行为时出错:', error);
            throw error;
        }
    }

    /**
     * 模拟人类输入文本
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string} selector 输入框选择器
     * @param {string} text 要输入的文本
     */
    async simulateHumanTyping(page, selector, text) {
        try {
            // 等待元素可见
            await page.waitForSelector(selector);
            
            // 先点击输入框，模拟用户行为
            await page.click(selector);
            await delay(this.#getRandomInt(300, 800));

            // 逐个字符输入
            for (const char of text.split('')) {
                await page.type(selector, char, {
                    delay: this.#getRandomInt(this.typeMinDelay, this.typeMaxDelay)
                });

                // 偶尔停顿一下，模拟思考
                if (Math.random() < 0.1) {
                    await delay(this.#getRandomInt(400, 1000));
                }
            }

            // 输入完成后的短暂停顿
            await delay(this.#getRandomInt(200, 500));
            logger.debug(`已模拟人工输入文本到 ${selector}`);
        } catch (error) {
            logger.error('模拟人类输入文本时出错:', error);
            throw error;
        }
    }

    // 递归搜索元素（支持Shadow DOM和iframe）
    async #findElementInFrames(page, selector, frameStack = [], opts = {}) {
        try {
            // 定义深度遍历查找函数
            const findInContext = async (context) => {
                // 1. 尝试在常规DOM中查找
                try {
                    const element = await context.$(selector);
                    if (element) {
                        const isVisible = await element.evaluate(el => {
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && 
                                   style.visibility !== 'hidden' && 
                                   style.opacity !== '0';
                        });
                        if (isVisible) {
                            return { element, frame: context };
                        }
                    }
                } catch (e) {
                    logger.debug(`常规DOM查找出错: ${e.message}`);
                }

                // 2. 遍历Shadow DOM
                try {
                    const shadowElements = await context.evaluateHandle((sel) => {
                        function queryShadowDOM(root, selector) {
                            const elements = [];
                            
                            // 检查当前节点
                            if (root.shadowRoot) {
                                const found = root.shadowRoot.querySelector(selector);
                                if (found) elements.push(found);

                                // 递归检查shadowRoot中的所有元素
                                root.shadowRoot.querySelectorAll('*').forEach(el => {
                                    elements.push(...queryShadowDOM(el, selector));
                                });
                            }

                            // 检查所有子元素
                            root.querySelectorAll('*').forEach(el => {
                                elements.push(...queryShadowDOM(el, selector));
                            });

                            return elements;
                        }

                        return queryShadowDOM(document.documentElement, sel);
                    }, selector);

                    const elements = await shadowElements.getProperties();
                    for (const [_, elementHandle] of elements) {
                        const element = elementHandle.asElement();
                        if (element) {
                            const isVisible = await element.evaluate(el => {
                                const style = window.getComputedStyle(el);
                                return style.display !== 'none' && 
                                       style.visibility !== 'hidden' && 
                                       style.opacity !== '0';
                            });
                            if (isVisible) {
                                return { element, frame: context };
                            }
                        }
                    }
                } catch (e) {
                    logger.debug(`Shadow DOM查找出错: ${e.message}`);
                }

                return null;
            };

            // 首先在当前上下文中查找
            const result = await findInContext(page);
            if (result) {
                return { ...result, frameStack };
            }

            // 获取所有iframe并递归搜索
            const frames = await page.frames();
            for (const frame of frames) {
                try {
                    // 确保frame已加载
                    await frame.waitForSelector('body', { timeout: 1000 }).catch(() => null);
                    
                    // 递归搜索当前frame
                    const result = await this.#findElementInFrames(
                        frame, 
                        selector, 
                        [...frameStack, frame],
                        opts
                    );
                    if (result) return result;
                    
                } catch (error) {
                    logger.debug(`在iframe中搜索时出错: ${error.message}`);
                    continue;
                }
            }

            return null;
        } catch (error) {
            logger.debug(`元素查找出错: ${error.message}`);
            return null;
        }
    }

    async simulateHoverAndClick(page, selector, options = {}) {
        const maxRetries = options.maxRetries || 5; // 增加重试次数
        let attempt = 0;
        
        while (attempt < maxRetries) {
            try {
                // 增加初始等待时间，确保页面完全加载
                await delay(this.#getRandomInt(1000, 2000));
                
                // 递归搜索所有上下文中的元素（包括Shadow DOM和iframe）
                const elementInfo = await this.#findElementInFrames(page, selector);
                
                if (!elementInfo) {
                    throw new Error(`Element not found: ${selector}`);
                }
                
                const { element, frame, frameStack } = elementInfo;
                
                // 增强元素可交互性检查
                // 计算iframe的累积偏移
                const offsetInfo = await page.evaluate((frameStack) => {
                    let totalOffsetX = 0;
                    let totalOffsetY = 0;
                    
                    // 遍历frameStack中的每个iframe，计算累积偏移
                    for (const frameIndex of frameStack) {
                        const frameElement = document.querySelector(`iframe:nth-child(${frameIndex + 1})`);
                        if (frameElement) {
                            const rect = frameElement.getBoundingClientRect();
                            totalOffsetX += rect.left;
                            totalOffsetY += rect.top;
                        }
                    }
                    
                    return { offsetX: totalOffsetX, offsetY: totalOffsetY };
                }, frameStack.map(f => f.parentFrame().childFrames().indexOf(f)));

                // 在目标上下文中检查元素是否可点击
                const isClickable = await frame.evaluate((el) => {
                    if (!el) return false;
                    
                    const style = window.getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    
                    // 检查元素是否被其他元素遮挡
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const elementAtPoint = document.elementFromPoint(centerX, centerY);
                    
                    return style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           parseFloat(style.opacity) > 0 &&
                           el.offsetParent !== null &&
                           rect.width > 0 &&
                           rect.height > 0 &&
                           !el.disabled &&
                           (elementAtPoint === el || el.contains(elementAtPoint));
                }, element);
    
                if (!isClickable) {
                    throw new Error('Element is not clickable or is obscured');
                }
    
                // 获取元素的位置
                const frameBox = await element.boundingBox();
                
                // 调整坐标以包含iframe偏移
                const box = {
                    x: frameBox.x + offsetInfo.offsetX,
                    y: frameBox.y + offsetInfo.offsetY,
                    width: frameBox.width,
                    height: frameBox.height
                };
                
                // 增加预热行为的复杂度
                await this.simulateHumanBehavior(page, { 
                    duration: this.#getRandomInt(1500, 2500),
                    movements: this.#getRandomInt(4, 7)
                });
    
                // 生成更自然的起始位置
                const viewport = await page.viewport();
                const startX = this.#getRandomInt(0, viewport.width);
                const startY = this.#getRandomInt(0, viewport.height);
                
                // 计算目标位置（增加随机性）
                const clickX = box.x + box.width * this.#getRandomFloat(0.2, 0.8);
                const clickY = box.y + box.height * this.#getRandomFloat(0.2, 0.8);
                
                // 生成贝塞尔曲线控制点
                const controlPoint1 = {
                    x: startX + (clickX - startX) * this.#getRandomFloat(0.2, 0.4),
                    y: startY + (clickY - startY) * this.#getRandomFloat(-0.5, 0.5)
                };
                const controlPoint2 = {
                    x: startX + (clickX - startX) * this.#getRandomFloat(0.6, 0.8),
                    y: startY + (clickY - startY) * this.#getRandomFloat(-0.5, 0.5)
                };
    
                // 使用贝塞尔曲线模拟自然的鼠标移动
                const steps = this.#getRandomInt(35, 50);
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const point = this.#bezierCurve(
                        { x: startX, y: startY },
                        controlPoint1,
                        controlPoint2,
                        { x: clickX, y: clickY },
                        t
                    );
                    await page.mouse.move(point.x, point.y);
                    await delay(this.#getRandomInt(5, 15));
                }
    
                // 模拟更自然的hover行为
                const hoverDuration = this.#getRandomInt(600, 1200);
                const hoverStart = Date.now();
                while (Date.now() - hoverStart < hoverDuration) {
                    const hoverX = clickX + this.#getRandomFloat(-2, 2);
                    const hoverY = clickY + this.#getRandomFloat(-2, 2);
                    await page.mouse.move(hoverX, hoverY);
                    await delay(this.#getRandomInt(20, 50));
                }
    
                // 确保元素在视口内并等待动画完成
                await page.evaluate(async (selector) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                        
                        // 等待可能的CSS过渡动画完成
                        const style = window.getComputedStyle(element);
                        const transitionDuration = parseFloat(style.transitionDuration) * 1000;
                        if (transitionDuration > 0) {
                            await new Promise(resolve => setTimeout(resolve, transitionDuration));
                        }
                    }
                }, selector);
    
                await delay(this.#getRandomInt(400, 700));
    
                // 模拟完整的事件序列
                await frame.evaluate((selector) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        const events = [
                            new MouseEvent('mouseover', { bubbles: true, cancelable: true }),
                            new MouseEvent('mouseenter', { bubbles: true, cancelable: true }),
                            new MouseEvent('mousemove', { bubbles: true, cancelable: true }),
                            new FocusEvent('focusin', { bubbles: true, cancelable: true }),
                            new MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
                            new MouseEvent('mousedown', { bubbles: true, cancelable: true, buttons: 1 }),
                            new MouseEvent('pointerup', { bubbles: true, cancelable: true }),
                            new MouseEvent('mouseup', { bubbles: true, cancelable: true }),
                            new MouseEvent('click', { bubbles: true, cancelable: true }),
                            new FocusEvent('focus', { bubbles: true, cancelable: true })
                        ];
                        
                        events.forEach(event => {
                            element.dispatchEvent(event);
                            void new Promise(r => setTimeout(r, 5 + Math.random() * 10));
                        });
                    }
                }, selector);

                // 执行实际点击
                await Promise.all([
                    page.mouse.click(clickX, clickY, {
                        delay: this.#getRandomInt(50, 150) // 增加按下时间
                    }),
                    frame.waitForFunction(
                        (sel) => {
                            const el = document.querySelector(sel);
                            return el && (
                                el.matches(':active') ||
                                el.matches(':focus') ||
                                el.matches(':focus-within')
                            );
                        },
                        { timeout: 2000 },
                        selector
                    ).catch(() => {}) // 忽略超时错误
                ]);
    
                // 点击后行为
                await delay(this.#getRandomInt(800, 1500));
                
                // 模拟点击后可能的鼠标移动
                const postClickX = clickX + this.#getRandomInt(-50, 50);
                const postClickY = clickY + this.#getRandomInt(-50, 50);
                await page.mouse.move(postClickX, postClickY, { steps: this.#getRandomInt(10, 20) });
                
                logger.debug(`第 ${attempt + 1} 次点击尝试成功`);
                return true;
    
            } catch (error) {
                attempt++;
                logger.warn(`第 ${attempt} 次点击尝试失败: ${error.message}`);
                
                if (attempt >= maxRetries) {
                    logger.error('达到最大重试次数，点击失败');
                    throw new Error(`无法完成点击操作: ${error.message}`);
                }
                
                // 重试前增加随机等待时间
                await delay(this.#getRandomInt(2000, 4000));
                
                // 尝试刷新页面重试
                if (attempt % 2 === 0) {
                    await page.reload({ waitUntil: ['networkidle0', 'domcontentloaded'] });
                    await delay(this.#getRandomInt(1000, 2000));
                }
            }
        }
    }
    
    // 添加点击标记辅助方法
    async #addClickMarker(page, x, y) {
        await page.evaluate((x, y) => {
            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.left = `${x}px`;
            marker.style.top = `${y}px`;
            marker.style.width = '3px';
            marker.style.height = '3px';
            marker.style.backgroundColor = 'red';
            marker.style.borderRadius = '50%';
            marker.style.zIndex = '9999';
            marker.style.transition = 'all 0.3s ease-out';
            document.body.appendChild(marker);
    
            // 添加点击波纹效果
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.left = `${x - 10}px`;
            ripple.style.top = `${y - 10}px`;
            ripple.style.width = '20px';
            ripple.style.height = '20px';
            ripple.style.border = '2px solid red';
            ripple.style.borderRadius = '50%';
            ripple.style.zIndex = '9998';
            ripple.style.animation = 'ripple 1s ease-out';
            document.body.appendChild(ripple);
    
            setTimeout(() => {
                marker.remove();
                ripple.remove();
            }, 2000);
        }, x, y);
    }

    
    

    /**
     * 深度搜索多层文档中的元素
     * @param {import('puppeteer').Page} page - Puppeteer页面对象
     * @param {string} selector - 要查找的元素选择器
     * @param {Object} options - 配置选项
     * @param {number} options.timeout - 超时时间（毫秒）
     * @param {boolean} options.visible - 是否只返回可见元素
     * @returns {Promise<{element: ElementHandle, context: Frame|Page}>} 
     */
    async findElementAcrossDocuments(page, selector, options = {}) {
        const timeout = options.timeout || 30000;
        const startTime = Date.now();
        
        // 递归搜索函数
        async function searchInContext(context, depth = 0) {
            try {
                // 1. 在当前上下文中查找普通元素
                const element = await context.$(selector);
                if (element) {
                    // 如果需要检查可见性
                    if (options.visible) {
                        const isVisible = await element.evaluate(el => {
                            const style = window.getComputedStyle(el);
                            return style.display !== 'none' && 
                                style.visibility !== 'hidden' && 
                                style.opacity !== '0' &&
                                el.offsetParent !== null;
                        });
                        
                        if (isVisible) {
                            logger.debug(`在深度 ${depth} 找到可见元素`);
                            return { element, context };
                        }
                    } else {
                        logger.debug(`在深度 ${depth} 找到元素`);
                        return { element, context };
                    }
                }

                // 2. 在Shadow DOM中查找
                const shadowElements = await context.evaluateHandle((sel) => {
                    function queryShadowDOM(root, selector) {
                        const elements = [];
                        
                        // 检查 shadow root
                        if (root.shadowRoot) {
                            const shadowResults = Array.from(root.shadowRoot.querySelectorAll(selector));
                            elements.push(...shadowResults);
                            
                            // 递归检查 shadow DOM 元素
                            Array.from(root.shadowRoot.querySelectorAll('*')).forEach(el => {
                                elements.push(...queryShadowDOM(el, selector));
                            });
                        }
                        
                        // 递归检查所有子元素
                        Array.from(root.querySelectorAll('*')).forEach(el => {
                            elements.push(...queryShadowDOM(el, selector));
                        });
                        
                        return elements;
                    }
                    
                    return queryShadowDOM(document.documentElement, sel);
                }, selector);

                const shadowProps = await shadowElements.getProperties();
                for (const [_, propHandle] of shadowProps) {
                    const element = propHandle.asElement();
                    if (element) {
                        if (options.visible) {
                            const isVisible = await element.evaluate(el => {
                                const style = window.getComputedStyle(el);
                                return style.display !== 'none' && 
                                    style.visibility !== 'hidden' && 
                                    style.opacity !== '0' &&
                                    el.offsetParent !== null;
                            });
                            
                            if (isVisible) {
                                logger.debug(`在深度 ${depth} 的Shadow DOM中找到可见元素`);
                                return { element, context };
                            }
                        } else {
                            logger.debug(`在深度 ${depth} 的Shadow DOM中找到元素`);
                            return { element, context };
                        }
                    }
                }

                // 3. 在所有iframe中递归查找
                const frames = context.frames ? await context.frames() : [];
                for (const frame of frames) {
                    try {
                        // 确保frame已加载
                        await frame.waitForFunction(() => document.readyState === 'complete', { 
                            timeout: Math.max(100, timeout - (Date.now() - startTime)) 
                        }).catch(() => {});
                        
                        // 递归搜索这个frame
                        const result = await searchInContext(frame, depth + 1);
                        if (result) {
                            return result;
                        }
                    } catch (error) {
                        logger.debug(`在iframe中搜索时出错: ${error.message}`);
                    }
                }

                return null;
            } catch (error) {
                logger.debug(`在深度 ${depth} 查找元素出错: ${error.message}`);
                return null;
            }
        }

        // 设置超时
        return new Promise(async (resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`查找元素超时: ${selector} (${timeout}ms)`));
            }, timeout);
            
            try {
                const result = await searchInContext(page);
                clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }
    
}

module.exports = HumanBehavior;
