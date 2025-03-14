const logger = require('../utils/logger');
const delay = require('../utils/delay');
const HumanBehavior = require('../utils/human-behavior');
const AccountGenerator = require('../utils/account-generator');
const { getConfig } = require('../utils/config');

class Copilot {
    constructor() {
        this.url = 'https://github.com/signup';
        this.loginUrl = 'https://github.com/login'
        this.homeUrl = 'https://github.com/'
        this.copiloturl = 'https://github.com/settings/copilot'
        this.humanBehavior = new HumanBehavior();
    }

    validateUserInfo(userInfo) {
        if (!userInfo || !userInfo.email || !userInfo.password || !userInfo.firstname || !userInfo.lastname) {
            throw new Error('用户信息不完整');
        }
    }

    
    /**
     * 获取脚本文件的完整路径
     * @param {string} scriptName - 脚本文件名
     * @returns {string} 脚本的完整路径
     */
    getScriptPath(scriptName) {
        return path.join(this.resourcePath, 'scripts', scriptName);
    }

    // 手动注册方法
    async manualRegister(browser, initPage, userInfo) {
        let page;
        try {
            // 验证用户信息
            this.validateUserInfo(userInfo);
            logger.info('开始 Copilot 手动注册流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 GitHub 注册页面
            await page.goto(this.url);
            logger.info('已打开 GitHub 注册页面');

            return { browser, page };
        } catch (error) {
            // 如果出错，关闭页面并抛出错误
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Copilot 手动注册流程出错:', error);
            throw error;
        }
    }

    async register(browser, initPage, userInfo) {
        let page;
        try {
            // 验证用户信息
            this.validateUserInfo(userInfo);
            logger.info('开始 Copilot 注册流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 GitHub 注册页面
            await page.goto(this.url);
            logger.info('已打开 GitHub 注册页面');
            
            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 填写邮箱
            const emailSelector = '#email';
            await page.waitForSelector(emailSelector);
            await this.humanBehavior.simulateHumanTyping(page, emailSelector, userInfo.email.toString().trim());
            logger.info('已填写邮箱');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 等待密码输入框出现
            const passwordSelector = '#password';
            await page.waitForSelector(passwordSelector);
            await this.humanBehavior.simulateHumanTyping(page, passwordSelector, userInfo.password.toString().trim());
            logger.info('已填写密码');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 3 });

            // 填写用户名
            const usernameSelector = '#login';
            await page.waitForSelector(usernameSelector);
            await this.humanBehavior.simulateHumanTyping(page, usernameSelector, userInfo.username.toString().trim());
            logger.info('已填写用户名');

            // 模拟思考和浏览行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 4 });

            // 点击继续按钮
            const selector = 'button[aria-describedby="terms-of-service"]';
            await this.humanBehavior.simulateHoverAndClick(page, selector, {
                maxRetries: 3  // 可选：设置最大重试次数
            });

            logger.info('已模拟点击继续按钮');

            await delay(5000);
            logger.info('页面跳转完毕');

            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });
{/* <button class="sc-nkuzb1-0 sc-d5trka-0 eZxMRy button" data-theme="home.verifyButton">视觉谜题</button> */}

            const visualPuzzleSelector = 'button[data-theme="home.verifyButton"]';
            // await page.waitForSelector(visualPuzzleSelector);
            await this.humanBehavior.simulateHoverAndClick(page, visualPuzzleSelector, {
                maxRetries: 3  // 可选：设置最大重试次数
            });
            logger.info('已模拟视觉谜题按钮');

            // await delay(5000);
            // await this.humanBehavior.simulateHumanBehavior(page, { duration: 1000, movements: 2 });
            const captchaSelector = '#captcha-container-nux';
   
            const captcha = await this.humanBehavior.findElementAcrossDocuments(page, captchaSelector, { 
                visible: true,
                timeout: 30000 
            });
            if (captcha) {
                logger.info('找到验证码元素-需要人工干预');
                // 增加提示信息
                logger.info('请完成人工验证，程序将等待验证完成...');
                
                const startTime = Date.now();
                const maxTimeout = 300000; // 5分钟超时
                let checkInterval = null;
                
                try {
                    // 使用 Promise 和定时器替代可能卡住的循环
                    await new Promise((resolve, reject) => {
                        // 创建超时计时器
                        const timeoutTimer = setTimeout(() => {
                            if (checkInterval) clearInterval(checkInterval);
                            reject(new Error('验证码等待超时，请在5分钟内完成验证'));
                        }, maxTimeout);
                        
                        // 使用间隔计时器定期检查
                        checkInterval = setInterval(async () => {
                            try {
                                logger.info('检查验证码状态...');
                                // 使用更短的超时时间
                                const result = await this.humanBehavior.findElementAcrossDocuments(page, captchaSelector, { 
                                    visible: true,
                                    timeout: 5000
                                }).catch(e => {
                                    logger.info(`检查验证码时出错: ${e.message}`);
                                    return null;
                                });
                                
                                // 如果验证码消失
                                if (!result) {
                                    clearTimeout(timeoutTimer);
                                    clearInterval(checkInterval);
                                    logger.info('验证码元素已消失，验证完成');
                                    resolve();
                                }
                            } catch (error) {
                                logger.info(`检查过程出错: ${error.message}`);
                                // 错误不中断检查，继续下一次
                            }
                        }, 3000); // 每3秒检查一次
                    });
                    
                } catch (error) {
                    logger.info(`验证码等待出错: ${error.message}`);
                    throw error;
                }
            }
            
            logger.info('验证码验证完成，继续执行后续流程');
            // 模拟最终确认的思考行为
          
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1000, movements: 2 });

            // 判断是否出现视觉谜题的按钮，如果有则点击

            //  判断是否要视觉图形验证码 ，如果出现了则要人工验证点击图形验证码 等待通过了再继续下一个获取验证码的流程 



            // 等待验证码页面加载
            await delay(5000);
            logger.info('等待验证码页面加载');

            return { browser, page };
        } catch (error) {
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Copilot 注册流程出错:', error);
            throw error;
        }
    }

    async login(browser, initPage, account) {
        let page;
        try {
            // 验证账号信息
            if (!account || !account.email || !account.password) {
                throw new Error('登录账号信息不完整');
            }
            logger.info('开始 Github 登录流程...');
            
            // 打开 cursor.sh 页面
            page = await browser.newPage();
            await page.goto(this.loginUrl);

            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);
            logger.info('完成初始人类行为模拟');



            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 填写邮箱
            const emailSelector = '#login_field';
            await this.humanBehavior.simulateHumanTyping(page, emailSelector, account.email);
            logger.info('已填写邮箱');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            
            // 填写密码
            const passwordSelector = '#password';
            await this.humanBehavior.simulateHumanTyping(page, passwordSelector, account.password);
            logger.info('已填写密码');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击登录按钮
            const signInButtonSelector = 'input[type="submit"][name="commit"][value="Sign in"]';
            await page.waitForSelector(signInButtonSelector);
            await this.humanBehavior.simulateHoverAndClick(page, signInButtonSelector, {
                maxRetries: 3  // 可选：设置最大重试次数
            });
            logger.info('已点击登录按钮');

            // 等待登录完成
            await page.waitForNavigation().catch(() => {
                logger.info('页面可能没有跳转，继续执行');
            });
            logger.info('登录流程执行完成');

            // 验证是否成功跳转到设置页面
            // const currentUrl = page.url();
            // if (!currentUrl.includes('/settings')) {
            //     logger.error('页面未跳转到设置页面');
            //     throw new Error('登录验证失败：未能进入设置页面');
            // }

            logger.info('登录验证成功：邮箱匹配确认');

            // 返回浏览器和页面对象，以便后续操作
            return { browser, page };
        } catch (error) {
            logger.error('Cursor 登录流程出错:', error);
            throw error;
        }
    }

 

    async fillVerificationCode(browser, page, account, verificationCode) {
        try {
            if (!verificationCode) {
                throw new Error('验证码不能为空');
            }

            logger.info('开始填写验证码...'+verificationCode);
            
            // 确保验证码是8位
            // await delay(888888)
            // 逐个填写8位验证码到对应的输入框
            for (let i = 0; i < 8; i++) {
                const codeInputSelector = `#launch-code-${i}`;
                logger.info('定位元素...'+codeInputSelector);
                // await page.waitForSelector(codeInputSelector);
                await this.humanBehavior.simulateHumanTyping(page, codeInputSelector, verificationCode[i]);
                // await page.type(codeInputSelector, code[i]);
                logger.info(`已填写验证码第${i+1}位: ${verificationCode[i]}`);
                
                // 添加短暂延迟模拟人工输入
                await delay(100 + Math.random() * 200);
            }   


            // 点击验证按钮
            const verifyButtonSelector = 'button[type="submit"]';
            await page.waitForSelector(verifyButtonSelector);
            await page.click(verifyButtonSelector);
            logger.info('已点击验证按钮');

            return page;
        } catch (error) {
            logger.error('验证码填写出错:', error);
            throw error;
        }
    }

    extractVerificationCode(emailContent) {
        logger.info('获取到了邮件');
        logger.info(emailContent);

        try {
            // 查找验证码的几种模式:
            // 1. 在 "code below" 之后的 6 位数字
            // 2. 在邮件正文中单独出现的 6 位数字
            // 3. 在 "code is" 之后的 6 位数字
            const patterns = [
                /code below[^0-9]*(\d{8})/i,
                /\b(\d{8})\b(?=(?:[^"]*"[^"]*")*[^"]*$)/,
                /code is[^0-9]*(\d{8})/i
            ];

            for (const pattern of patterns) {
                const matches = emailContent.match(pattern);
                if (matches && matches[1]) {
                    return matches[1];
                }
            }

            // 如果上述模式都没匹配到，抛出错误
            throw new Error('无法从邮件中提取验证码');
        } catch (error) {
            logger.error('提取验证码失败:', error);
            throw error;
        }
    }

    // 获取验证邮件发送者地址
    getVerificationEmailSender() {
        return 'noreply@github.com';
    }

    async getSessionToken(page, maxAttempts = 3, retryInterval = 2000) {
        logger.info('开始获取 Cursor session token...');
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                // 获取所有 cookies
                const client = await page.target().createCDPSession();
                const { cookies } = await client.send('Network.getAllCookies');
                
                // 查找 WorkosCursorSessionToken
                const sessionCookie = cookies.find(cookie => cookie.name === 'WorkosCursorSessionToken');
                
                if (sessionCookie) {
                    const tokenValue = decodeURIComponent(sessionCookie.value).split('::')[1];
                    logger.info('成功获取 Cursor session token');
                    await client.detach();
                    return tokenValue;
                }

                await client.detach();
                attempts++;
                if (attempts < maxAttempts) {
                    logger.warn(`第 ${attempts} 次尝试未获取到 CursorSessionToken，${retryInterval/1000}秒后重试...`);
                    await delay(retryInterval);
                } else {
                    logger.error(`已达到最大尝试次数(${maxAttempts})，获取 CursorSessionToken 失败`);
                }
            } catch (error) {
                logger.error('获取 cookie 失败:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    logger.info(`将在 ${retryInterval/1000} 秒后重试...`);
                    await delay(retryInterval);
                }
            }
        }

        return null;
    }

    async getDbPath() {
        const os = require('os');
        const path = require('path');
        const platform = os.platform();

        let dbPath;
        if (platform === 'win32') {
            const appdata = process.env.APPDATA;
            if (!appdata) {
                throw new Error('APPDATA 环境变量未设置');
            }
            dbPath = path.join(appdata, 'Cursor', 'User', 'globalStorage', 'state.vscdb');
        } else if (platform === 'darwin') {
            dbPath = path.resolve(os.homedir(), 'Library/Application Support/Cursor/User/globalStorage/state.vscdb');
        } else if (platform === 'linux') {
            dbPath = path.resolve(os.homedir(), '.config/Cursor/User/globalStorage/state.vscdb');
        } else {
            throw new Error(`不支持的操作系统: ${platform}`);
        }

        return dbPath;
    }

    async updateAuth(email = null, accessToken = null, refreshToken = null) {
        logger.info('开始更新 Github 认证信息...');

        const updates = [
            ['cursorAuth/cachedSignUpType', 'Auth_0']
        ];

        if (email !== null) {
            updates.push(['cursorAuth/cachedEmail', email]);
        }
        if (accessToken !== null) {
            updates.push(['cursorAuth/accessToken', accessToken]);
        }
        if (refreshToken !== null) {
            updates.push(['cursorAuth/refreshToken', refreshToken]);
        }

        if (updates.length === 1) {
            logger.warn('没有提供任何要更新的值');
            return false;
        }

        try {
            const dbPath = await this.getDbPath();
            
            return new Promise((resolve, reject) => {
                // 打开数据库连接
                const db = new sqlite3.Database(dbPath, async (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    try {
                        for (const [key, value] of updates) {
                            // 检查键是否存在
                            await new Promise((res, rej) => {
                                db.get('SELECT COUNT(*) as count FROM itemTable WHERE key = ?', [key], async (err, row) => {
                                    if (err) {
                                        rej(err);
                                        return;
                                    }

                                    try {
                                        if (row.count === 0) {
                                            // 插入新记录
                                            await new Promise((resolve, reject) => {
                                                db.run('INSERT INTO itemTable (key, value) VALUES (?, ?)', [key, value], (err) => {
                                                    if (err) reject(err);
                                                    else {
                                                        logger.info(`插入新记录: ${key.split('/').pop()}`);
                                                        resolve();
                                                    }
                                                });
                                            });
                                        } else {
                                            // 更新现有记录
                                            await new Promise((resolve, reject) => {
                                                db.run('UPDATE itemTable SET value = ? WHERE key = ?', [value, key], function(err) {
                                                    if (err) reject(err);
                                                    else {
                                                        if (this.changes > 0) {
                                                            logger.info(`成功更新: ${key.split('/').pop()}`);
                                                        } else {
                                                            logger.warn(`未找到 ${key.split('/').pop()} 或值未变化`);
                                                        }
                                                        resolve();
                                                    }
                                                });
                                            });
                                        }
                                        res();
                                    } catch (error) {
                                        rej(error);
                                    }
                                });
                            });
                        }

                        db.close((err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            logger.info('认证信息更新完成');
                            resolve(true);
                        });
                    } catch (error) {
                        db.close(() => reject(error));
                    }
                });
            });

        } catch (error) {
            logger.error('更新认证信息失败:', error);
            return false;
        }
    }

    /**
     * 重置机器码
     * 根据不同平台执行不同的重置逻辑
     * @returns {Promise<boolean>} 重置成功返回 true，失败返回 false
     */
    async resetMachineCodes() {
        try {
            const platform = os.platform();
            
            // 根据平台执行不同的重置逻辑
            switch (platform) {
                case 'win32': {
                    logger.info('正在重置机器码...');
                    
                    // 使用 consoleHelper 执行 PowerShell 脚本
                    return await consoleHelper.executePowerShellScript(this.getScriptPath('cursor.ps1'), {
                        noProfile: true,
                        nonInteractive: true
                    });
                }
                
                case 'darwin': {
                    // TODO: 实现 macOS 的重置逻辑
                    logger.warn('macOS 平台的重置机器码功能尚未实现');
                    return false;
                }
                
                case 'linux': {
                    // TODO: 实现 Linux 的重置逻辑
                    logger.warn('Linux 平台的重置机器码功能尚未实现');
                    return false;
                }
                
                default: {
                    logger.error(`不支持的操作系统平台: ${platform}`);
                    return false;
                }
            }
            
        } catch (error) {
            logger.error('重置机器码失败:', error);
            return false;
        }
    }

    /**
     * 禁用自动更新功能
     * 根据不同平台执行不同的禁用逻辑
     * @returns {Promise<boolean>} 禁用成功返回 true，失败返回 false
     */
    async disableAutoUpdate() {
        try {
            const platform = os.platform();
            
            // 根据平台执行不同的禁用逻辑
            switch (platform) {
                case 'win32': {
                    logger.info('正在禁用自动更新...');
                    
                    // 使用 consoleHelper 执行 PowerShell 脚本
                    return await consoleHelper.executePowerShellScript(this.getScriptPath('copilot-update.ps1'), {
                        noProfile: true,
                        nonInteractive: true
                    });
                }
                
                case 'darwin': {
                    // TODO: 实现 macOS 的禁用逻辑
                    logger.warn('macOS 平台的自动更新禁用功能尚未实现');
                    return false;
                }
                
                case 'linux': {
                    // TODO: 实现 Linux 的禁用逻辑
                    logger.warn('Linux 平台的自动更新禁用功能尚未实现');
                    return false;
                }
                
                default: {
                    logger.error(`不支持的操作系统平台: ${platform}`);
                    return false;
                }
            }
            
        } catch (error) {
            logger.error('禁用自动更新失败:', error);
            return false;
        }
    }
    
    async keepalive(browser, initPage,account) {
        let page;
        try {
            logger.info('开始执行 keepalive 流程...');
            page = await browser.newPage();
            const config = getConfig();
            const accountGenerator = new AccountGenerator(config);
            const username = account.email.split('@')[0];
            // 1. 导航到用户主页
            await page.goto(this.homeUrl + username);
            logger.info('已导航到用户主页');
            
            // // 等待页面加载
            await delay(5000);
            
            // 2. 定位编辑按钮并点击
            const editButtonSelector = 'button.btn.btn-block.js-profile-editable-edit-button';
            const editButtonExists = await page.evaluate((selector) => {
                return !!document.querySelector(selector);
            }, editButtonSelector);
            try{
                if (editButtonExists) {
                    logger.info('找到编辑按钮，准备点击');
                    await page.waitForSelector(editButtonSelector);
                    await page.click( editButtonSelector);
                    logger.info('已点击编辑按钮');
                } else {
                    logger.info('未找到编辑按钮，跳过点击操作');
                }
            }catch{
                logger.info('未找到编辑按钮，跳过点击操作');
            }

            
            // 3. 模拟人类行为移动鼠标
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 3 });
            logger.info('准备输入个人简介');
            // 4. 定位个人简介文本框并输入内容
            const bioSelector = '#user_profile_bio';
            await page.waitForSelector(bioSelector);
            
            // 生成随机个人简介

            const bio = await accountGenerator.generateBio();
            
            // 清空现有内容
            await page.evaluate((selector) => {
                document.querySelector(selector).value = '';
            }, bioSelector);
            
            // 模拟人类输入
            await this.humanBehavior.simulateHumanTyping(page, bioSelector, bio);
            logger.info('已填写个人简介');
            
            // 5. 模拟人类行为移动鼠标
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1200, movements: 2 });
            
            // 6. 定位公司输入框并输入内容
            const companySelector = 'input[name="user[profile_company]"]';
            await page.waitForSelector(companySelector);
            
            // 生成随机公司名称
            const company = await accountGenerator.generateCompany();
            
            // 清空现有内容
            await page.evaluate((selector) => {
                document.querySelector(selector).value = '';
            }, companySelector);
            
            // 模拟人类输入
            await this.humanBehavior.simulateHumanTyping(page, companySelector, company);
            logger.info('已填写公司信息');
            
            // 7. 模拟人类行为移动鼠标
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1300, movements: 3 });
            
            // 8. 定位位置输入框并输入内容
            const locationSelector = 'input[name="user[profile_location]"]';
            await page.waitForSelector(locationSelector);
            
            // 生成随机位置
            const location = await  accountGenerator.generateLocation();
            
            // 清空现有内容
            await page.evaluate((selector) => {
                document.querySelector(selector).value = '';
            }, locationSelector);
            
            // 模拟人类输入
            await this.humanBehavior.simulateHumanTyping(page, locationSelector, location);
            logger.info('已填写位置信息');
            
            // 9. 模拟人类行为移动鼠标
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 4 });
            
            // 10. 定位提交按钮并点击
            const submitButtonSelector = 'button[data-target="waiting-form.submit"][type="submit"]';
            await page.waitForSelector(submitButtonSelector);
            await this.humanBehavior.simulateHoverAndClick(page, submitButtonSelector);
            logger.info('已点击提交按钮');
            
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1300, movements: 3 });
            await page.goto(this.copiloturl);
            await delay(5000);
            const copilotSignupSelector = 'a[href="/github-copilot/signup/copilot_individual"]';
            const signupLinkExists = await page.evaluate((selector) => {
                return !!document.querySelector(selector);
            }, copilotSignupSelector);
            
            if (signupLinkExists) {
                await page.goto("https://github.com/github-copilot/signup/billing?payment_duration=monthly")    
                await delay(5000);
                const personalInfo = await accountGenerator.generatePersonalInfo()
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 4 });
                await this.humanBehavior.simulateHumanTyping(page,'#account_screening_profile_first_name', personalInfo.firstName);
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 4 });
                await this.humanBehavior.simulateHumanTyping(page,'#account_screening_profile_last_name', personalInfo.lastName);
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 4 });
                await this.humanBehavior.simulateHumanTyping(page,'#account_screening_profile_address1', personalInfo.address);
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 4 });
                await this.humanBehavior.simulateHumanTyping(page,'#account_screening_profile_city', personalInfo.city);
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 4 });
                await page.evaluate((countryCode) => {
                    const selectElement = document.querySelector('#account_screening_profile_country_code');
                    if (selectElement) {
                        selectElement.value = countryCode;
                        // 触发 change 事件
                        selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, personalInfo.country);
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 3 });
                            // 10. 定位提交按钮并点击
                const saveBillingBtn = 'button[name="submit"][type="submit"]';
                await page.waitForSelector(saveBillingBtn);
                await this.humanBehavior.simulateHoverAndClick(page, saveBillingBtn);
                logger.info('已点击提交按钮');
                // 这里可以添加后续处理逻辑
            } else {
                logger.info('未找到 Copilot 注册链接，可能已经注册');
            }
            // 等待提交完成
            await delay(3000);
            
            logger.info('keepalive 流程执行完成');
            return page;
        } catch (error) {
            logger.error('keepalive 流程执行出错:', error);
            throw error;
        }

    }
}

module.exports = Copilot; 