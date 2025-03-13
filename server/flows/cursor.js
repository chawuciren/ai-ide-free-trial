const logger = require('../utils/logger');
const delay = require('../utils/delay');
const HumanBehavior = require('../utils/human-behavior');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');
const { spawn } = require('child_process');
const consoleHelper = require('../utils/console-helper');

class Cursor {
    constructor() {
        this.url = 'https://cursor.sh';
        this.humanBehavior = new HumanBehavior();
        
        // 获取资源路径 - 根据环境变量调整
        this.resourcePath = process.env.NODE_ENV === 'development'
            ? process.env.APP_ROOT  // 开发环境：使用 APP_ROOT
            : process.env.RES_PATH; // 生产环境：使用传入的 resourcesPath
    }

    /**
     * 获取脚本文件的完整路径
     * @param {string} scriptName - 脚本文件名
     * @returns {string} 脚本的完整路径
     */
    getScriptPath(scriptName) {
        return path.join(this.resourcePath, 'scripts', scriptName);
    }

    // 登录方法
    async login(browser, initPage, account) {
        let page;
        try {
            // 验证账号信息
            if (!account || !account.email || !account.password) {
                throw new Error('登录账号信息不完整');
            }
            logger.info('开始 Cursor 登录流程...');
            
            // 打开 cursor.sh 页面
            page = await browser.newPage();
            await page.goto(this.url);

            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);
            logger.info('完成初始人类行为模拟');

            // 等待并点击登录按钮
            const loginButtonSelector = 'a[href^="/api/auth/login"]';
            await page.waitForSelector(loginButtonSelector);
            await page.click(loginButtonSelector);
            await page.waitForNavigation();
            logger.info('已点击登录按钮并等待页面跳转完成');

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 填写邮箱
            const emailSelector = 'input[type="email"][placeholder="Your email address"]';
            await this.humanBehavior.simulateHumanTyping(page, emailSelector, account.email);
            logger.info('已填写邮箱');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击继续按钮
            const continueButtonSelector = 'button[type="submit"]';
            await page.waitForSelector(continueButtonSelector);
            await page.click(continueButtonSelector);
            logger.info('已点击继续按钮');

            // 等待页面跳转到密码输入页面
            await page.waitForNavigation().catch(() => {
                logger.info('页面可能没有跳转，继续执行');
            });

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);
            
            // 填写密码
            const passwordSelector = 'input[type="password"][name="password"]';
            await this.humanBehavior.simulateHumanTyping(page, passwordSelector, account.password);
            logger.info('已填写密码');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击登录按钮
            const signInButtonSelector = 'button[type="submit"][name="intent"][value="password"]';
            await page.waitForSelector(signInButtonSelector);
            await page.click(signInButtonSelector);
            logger.info('已点击登录按钮');

            // 等待登录完成
            await page.waitForNavigation().catch(() => {
                logger.info('页面可能没有跳转，继续执行');
            });
            logger.info('登录流程执行完成');

            // 验证是否成功跳转到设置页面
            const currentUrl = page.url();
            if (!currentUrl.includes('/settings')) {
                logger.error('页面未跳转到设置页面');
                throw new Error('登录验证失败：未能进入设置页面');
            }

            logger.info('登录验证成功：邮箱匹配确认');

            // 返回浏览器和页面对象，以便后续操作
            return { browser, page };
        } catch (error) {
            logger.error('Cursor 登录流程出错:', error);
            throw error;
        }
    }

    validateUserInfo(userInfo) {
        if (!userInfo || !userInfo.email || !userInfo.password || !userInfo.firstname || !userInfo.lastname) {
            throw new Error('用户信息不完整');
        }
    }

    // 手动注册方法
    async manualRegister(browser, initPage, userInfo) {
        let page;
        try {
            // 验证用户信息
            this.validateUserInfo(userInfo);
            logger.info('开始 Cursor 手动注册流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 cursor.sh 页面
            await page.goto(this.url);
            logger.info('已打开 Cursor 页面');

            return { browser, page };
        } catch (error) {
            // 如果出错，关闭页面并抛出错误
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Cursor 手动注册流程出错:', error);
            throw error;
        }
    }

    async register(browser, initPage, userInfo) {
        let page;
        try {
            // 验证用户信息
            this.validateUserInfo(userInfo);
            logger.info('开始 Cursor 注册流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 cursor.sh 页面
            await page.goto(this.url);
            logger.info('已打开 Cursor 页面');
            
            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 等待并点击登录按钮
            const loginButtonSelector = 'a[href^="/api/auth/login"]';
            await page.waitForSelector(loginButtonSelector);
            await page.click(loginButtonSelector);
            await page.waitForNavigation();
            logger.info('已点击登录按钮并等待页面跳转完成');
            
            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);
            
            const signUpSelector = 'a[href^="/sign-up"]';
            await page.waitForSelector(signUpSelector);
            await page.click(signUpSelector);
            await page.waitForNavigation();
            logger.info('已点击注册链接并等待页面跳转完成');

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 填写注册表单
            logger.info('开始填写注册表单...');
            
            // 填写名字
            const firstNameSelector = 'input[name="first_name"][placeholder="Your first name"]';
            await this.humanBehavior.simulateHumanTyping(page, firstNameSelector, userInfo.firstname.toString().trim());
            logger.info('已填写名字');

            // 填写姓氏
            const lastNameSelector = 'input[name="last_name"][placeholder="Your last name"]';
            await this.humanBehavior.simulateHumanTyping(page, lastNameSelector, userInfo.lastname.toString().trim());
            logger.info('已填写姓氏');

            // 填写邮箱
            const emailSelector = 'input[type="email"][name="email"][placeholder="Your email address"]';
            await this.humanBehavior.simulateHumanTyping(page, emailSelector, userInfo.email.toString().trim());
            logger.info('已填写邮箱');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击继续按钮
            const continueButtonSelector = 'button[type="submit"][value="sign-up"]';
            await page.waitForSelector(continueButtonSelector);
            await page.click(continueButtonSelector);
            logger.info('已点击继续按钮');

            // 等待跳转到密码页面
            await page.waitForNavigation();
            logger.info('已跳转到密码页面');

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 填写密码
            const passwordSelector = 'input[type="password"]';
            await this.humanBehavior.simulateHumanTyping(page, passwordSelector, userInfo.password.toString().trim());
            logger.info('已填写密码');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击注册按钮
            const registerButtonSelector = 'button[type="submit"]';
            await page.waitForSelector(registerButtonSelector);
            await page.click(registerButtonSelector);
            logger.info('已点击注册按钮');

            // 等待跳转到验证码页面
            await page.waitForNavigation();
            logger.info('已跳转到验证码页面');

            // 返回浏览器和页面对象，以便后续填写验证码
            return { browser, page };
        } catch (error) {
            // 如果出错，关闭页面并抛出错误
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Cursor 注册流程出错:', error);
            throw error;
        }
    }

    async fillVerificationCode(browser, page, account, verificationCode) {
        try {
            logger.info('开始填写验证码...');
            
            // 验证验证码格式
            if (!verificationCode || typeof verificationCode !== 'string' || verificationCode.trim() === '') {
                throw new Error('验证码不能为空');
            }

            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 3 });

            // 等待第一个验证码输入框出现
            const codeInputSelector = 'input[data-test="otp-input"]';
            await page.waitForSelector(codeInputSelector);

            // 获取所有验证码输入框
            const inputs = await page.$$('input[inputmode="numeric"][maxlength="1"]');
            
            // 逐个填写验证码数字，每个数字之间添加随机延迟
            const codeDigits = verificationCode.trim().split('');
            for (let i = 0; i < codeDigits.length && i < inputs.length; i++) {
                // 每个数字输入前添加随机延迟
                await delay(500 + Math.random() * 1000);
                await inputs[i].type(codeDigits[i]);
                logger.info(`已填写第 ${i + 1} 位验证码`);
            }

            // 等待页面自动跳转
            await page.waitForNavigation({ timeout: 30000 }).catch(error => {
                logger.warn('等待页面跳转超时，可能已经跳转完成');
            });
            logger.info('验证码填写完成');

            // 验证是否成功跳转到设置页面
            const currentUrl = page.url();
            if (!currentUrl.includes('/settings')) {
                logger.error('页面未跳转到设置页面');
                throw new Error('登录验证失败：未能进入设置页面');
            }

            logger.info('登录验证成功：已进入设置页面');
            return { browser, page };
        } catch (error) {
            logger.error('验证码填写出错:', error);
            throw error;
        }
    }

    // 解析验证码
    extractVerificationCode(emailContent) {
        try {
            // 查找验证码的几种模式:
            // 1. 在 "code below" 之后的 6 位数字
            // 2. 在邮件正文中单独出现的 6 位数字
            // 3. 在 "code is" 之后的 6 位数字
            const patterns = [
                /code below[^0-9]*(\d{6})/i,
                /\b(\d{6})\b(?=(?:[^"]*"[^"]*")*[^"]*$)/,
                /code is[^0-9]*(\d{6})/i
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
        return 'no-reply@cursor.sh';
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
        logger.info('开始更新 Cursor 认证信息...');

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
                    return await consoleHelper.executePowerShellScript(this.getScriptPath('cursor-update.ps1'), {
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
 
        return true
    }

}

module.exports = Cursor;
