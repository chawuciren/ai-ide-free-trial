const express = require('express');
const path = require('path');
const router = express.Router();
const logger = require('../utils/logger');
const { getConfig } = require('../utils/config');
const CloudflareEmailManager = require('../utils/cloudflare-email-router');
const AccountDataHandler = require('../utils/account-data-handler');
const EmailHandler = require('../utils/email-handler');
const TempMail = require('../utils/tempmail');
const BrowserInitializer = require('../utils/browser-initializer');
const AccountGenerator = require('../utils/account-generator');
const Cursor = require('../flows/cursor');
const Copilot = require('../flows/copilot');
const PublicMailApi = require('../utils/public-mail-api');

async function getVerificationCode(account, config, { browser = null, tempMailPage = null, registrationFlow = null, emailHandler = null, tempMail = null, publicMailApi = null } = {}) {
    logger.info('等待接收验证码邮件...');
    let verificationCode;

    if (config.email.type === 'publicApi') {
        const response = await publicMailApi.getEmails(config.registration.type, account.email);
        if (response.success && response.data) {
            verificationCode = response.data.verificationCode;
            logger.info('从 Public API 获取到验证码:', verificationCode);
        } else {
            throw new Error('未能从 Public API 获取到验证码');
        }
    } else if (config.email.type === 'tempmail') {
        if (!tempMail || !browser || !tempMailPage || !registrationFlow) {
            throw new Error('TempMail 模式下需要提供 tempMail, browser, tempMailPage 和 registrationFlow');
        }
        verificationCode = await tempMail.waitForEmail(browser, tempMailPage, registrationFlow, account);
    } else {
        if (!emailHandler || !registrationFlow) {
            throw new Error('IMAP 模式下需要提供 emailHandler 和 registrationFlow');
        }
        verificationCode = await emailHandler.waitForVerificationEmail(registrationFlow, account);
    }

    logger.info(`收到验证码: ${verificationCode}`);
    return verificationCode;
}

// 完整的一键注册流程
router.post('/complete', async (req, res) => {
    let cloudflareManager = null;
    let accountDataHandler = null;
    let emailHandler = null;
    let tempMail = null;
    let browser = null;
    let page = null;
    let tempMailPage = null;
    let publicMailApi = null;
    
    try {
        // 获取配置
        const config = getConfig();

        // 初始化数据处理器
        logger.info('初始化数据处理器...');
        accountDataHandler = new AccountDataHandler();
        await accountDataHandler.initialize();
        logger.info('数据处理器初始化完成');

        // 根据配置初始化邮件处理器
        logger.info('初始化邮件处理器...');
        if (config.email.type === 'publicApi') {
            publicMailApi = new PublicMailApi();
            logger.info('PublicMailApi 初始化完成');
        } else if (config.email.type === 'tempmail') {
            tempMail = new TempMail(config);
            const { browser: tempMailBrowser, page: tempMailPageResult } = await tempMail.initialize(browser, initialPage);
            tempMailPage = tempMailPageResult;
            logger.info('TempMail 初始化完成');
        } else {
            emailHandler = new EmailHandler(config);
            await emailHandler.initialize();
            logger.info('EmailHandler 初始化完成');
        }

        // 初始化浏览器
        logger.info('初始化浏览器...');
        const browserInitializer = new BrowserInitializer(config);
        const { browser: initBrowser, page: initialPage } = await browserInitializer.initBrowser();
        browser = initBrowser;
        logger.info('浏览器初始化完成');

        // 创建账号生成器实例
        logger.info('创建账号生成器实例...');
        const accountGenerator = new AccountGenerator(config);
        
        // 生成新的账号信息
        logger.info('开始生成新的账号信息...');
        const account = await accountGenerator.generateAccount();
        
        // 创建 Cloudflare 邮件管理器实例并注册邮件账号
        logger.info('创建 Cloudflare 邮件管理器实例...');
        cloudflareManager = new CloudflareEmailManager(config);
        await cloudflareManager.registerEmailAccount(account);
        
        // 添加新记录
        const newRecord = {
            ...account,
            status: AccountDataHandler.AccountStatus.CREATED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await accountDataHandler.appendRecord(newRecord);
        logger.info('账号信息已保存到数据库');

        // 执行注册流程
        logger.info(`开始执行 ${config.registration.type} 注册流程...`);
        let registrationFlow;
        if (config.registration.type === 'cursor') {
            registrationFlow = new Cursor();
        } else if (config.registration.type === 'copilot') {
            registrationFlow = new Copilot();
        } else {
            throw new Error(`不支持的注册流程类型: ${config.registration.type}`);
        }

        // 如果是手动模式，打印账号信息并等待用户操作
        if (config.registration.manual) {
            // 手动注册流程
            const { browser: registerBrowser, page: registrationPage } = await registrationFlow.manualRegister(browser, initialPage, account);
            browser = registerBrowser;
            page = registrationPage;
            
            logger.info('请在浏览器中手动完成注册步骤');
            return res.json({
                success: true,
                message: '请在浏览器中完成手动注册步骤',
                account
            });
        } else {
            // 自动注册流程
            const { browser: registerBrowser, page: registrationPage } = await registrationFlow.register(browser, initialPage, account);
            browser = registerBrowser;
            page = registrationPage;
            logger.info(`${config.registration.type} 注册流程执行完成，等待验证码`);
        }

        // 等待接收验证码邮件
        const verificationCode = await getVerificationCode(account, config, {
            browser,
            tempMailPage,
            registrationFlow,
            emailHandler,
            tempMail,
            publicMailApi
        });

        // 更新记录
        await accountDataHandler.updateRecord(
            account.email,
            { 
                status: AccountDataHandler.AccountStatus.CODE_RECEIVED,
                verificationCode,
                updatedAt: new Date().toISOString()
            }
        );
        logger.info('验证码已更新到数据库');

        if (config.registration.manual) {
            return res.json({
                success: true,
                message: '请在页面中手动输入验证码',
                verificationCode
            });
        } else {
            // 自动填写验证码
            const { browser: verifiedBrowser, page: verifiedPage } = await registrationFlow.fillVerificationCode(browser, page, verificationCode);
            browser = verifiedBrowser;
            page = verifiedPage;
        }

        // 更新账号状态
        await accountDataHandler.updateRecord(
            account.email,
            { 
                status: AccountDataHandler.AccountStatus.VERIFIED,
                updatedAt: new Date().toISOString()
            }
        );
        logger.info('账号状态已更新为已验证');

        // 获取 session token
        logger.info('正在获取登录信息...');
        const sessionToken = await registrationFlow.getSessionToken(page);
        if (!sessionToken) {
            throw new Error('获取 session token 失败');
        }
        logger.info('成功获取 session token');

        // 更新认证信息
        const authSuccess = await registrationFlow.updateAuth(
            account.email,
            sessionToken,
            sessionToken
        );

        if (!authSuccess) {
            throw new Error('更新认证信息失败');
        }
        logger.info('认证信息更新成功');

        // 重置机器码
        logger.info('正在重置机器码...');
        await registrationFlow.resetMachineCodes();
        logger.info('机器码重置完成');

        res.json({
            success: true,
            message: '注册流程已完成',
            account: { ...account, verificationCode }
        });

    } catch (error) {
        logger.error('注册流程执行失败:', error);
        res.status(500).json({
            success: false,
            error: '注册流程执行失败',
            message: error.message
        });
    } finally {
        // 清理资源
        if (emailHandler) {
            await emailHandler.close();
        }
        if (tempMailPage) {
            await tempMailPage.close();
        }
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
    }
});

// 单独的注册流程
router.post('/register', async (req, res) => {
    let browser = null;
    let page = null;
    let tempMailPage = null;
    let emailHandler = null;
    let tempMail = null;
    let accountDataHandler = null;
    let publicMailApi = null;

    try {
        const { email, firstname, lastname, username, password } = req.body;

        // 验证必要的输入参数
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: '无效的邮箱地址'
            });
        }

        if (!firstname || !lastname || !username || !password) {
            return res.status(400).json({
                success: false,
                error: '缺少必要的注册信息'
            });
        }

        // 获取配置
        const config = getConfig();

        // 初始化数据处理器
        logger.info('初始化数据处理器...');
        accountDataHandler = new AccountDataHandler();
        await accountDataHandler.initialize();
        logger.info('数据处理器初始化完成');

        // 根据配置初始化邮件处理器
        logger.info('初始化邮件处理器...');
        if (config.email.type === 'publicApi') {
            publicMailApi = new PublicMailApi();
            logger.info('PublicMailApi 初始化完成');
        } else if (config.email.type === 'tempmail') {
            tempMail = new TempMail(config);
            const { browser: tempMailBrowser, page: tempMailPageResult } = await tempMail.initialize(browser, initialPage);
            tempMailPage = tempMailPageResult;
            logger.info('TempMail 初始化完成');
        } else {
            emailHandler = new EmailHandler(config);
            await emailHandler.initialize();
            logger.info('EmailHandler 初始化完成');
        }

        // 初始化浏览器
        logger.info('初始化浏览器...');
        const browserInitializer = new BrowserInitializer(config);
        const { browser: initBrowser, page: initialPage } = await browserInitializer.initBrowser();
        browser = initBrowser;
        logger.info('浏览器初始化完成');

        // 准备账号信息
        const account = {
            email,
            firstname,
            lastname,
            username,
            password,
            status: AccountDataHandler.AccountStatus.CREATED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 执行注册流程
        logger.info(`开始执行 ${config.registration.type} 注册流程...`);
        let registrationFlow;
        if (config.registration.type === 'cursor') {
            registrationFlow = new Cursor();
        } else if (config.registration.type === 'copilot') {
            registrationFlow = new Copilot();
        } else {
            throw new Error(`不支持的注册流程类型: ${config.registration.type}`);
        }

        // 执行自动注册流程
        const { browser: registerBrowser, page: registrationPage } = await registrationFlow.register(browser, initialPage, account);
        browser = registerBrowser;
        page = registrationPage;
        logger.info(`${config.registration.type} 注册流程执行完成，等待验证码`);

        // 等待接收验证码邮件
        const verificationCode = await getVerificationCode(account, config, {
            browser,
            tempMailPage,
            registrationFlow,
            emailHandler,
            tempMail,
            publicMailApi
        });

        // 更新记录
        await accountDataHandler.updateRecord(
            account.email,
            { 
                status: AccountDataHandler.AccountStatus.CODE_RECEIVED,
                verificationCode,
                updatedAt: new Date().toISOString()
            }
        );
        logger.info('验证码已更新到数据库');

        // 自动填写验证码
        const { browser: verifiedBrowser, page: verifiedPage } = await registrationFlow.fillVerificationCode(browser, page, account, verificationCode);
        browser = verifiedBrowser;
        page = verifiedPage;

        // 更新账号状态为已验证
        await accountDataHandler.updateRecord(
            account.email,
            { 
                status: AccountDataHandler.AccountStatus.VERIFIED,
                updatedAt: new Date().toISOString()
            }
        );
        logger.info('账号状态已更新为已验证');

        res.json({
            success: true,
            message: '注册流程已完成',
            account: { ...account, verificationCode }
        });

    } catch (error) {
        logger.error('注册流程执行失败:', error);
        res.status(500).json({
            success: false,
            error: '注册流程执行失败',
            message: error.message
        });
    } finally {
        // 清理资源
        if (emailHandler) {
            await emailHandler.close();
        }
        if (tempMailPage) {
            await tempMailPage.close();
        }
        if (page) {
            await page.close();
        }
        if (browser) {
            await browser.close();
        }
    }
});

// 单步登录流程
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: '无效的邮箱地址'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                error: '密码不能为空'
            });
        }

        // 初始化浏览器
        logger.info('正在初始化浏览器...');
        
        const config = getConfig();
        const browserInitializer = new BrowserInitializer(config);
        const { browser, page } = await browserInitializer.initBrowser();

        if (!browser || !page) {
            throw new Error('浏览器实例未初始化，请先调用初始化接口');
        }

        // 根据配置初始化对应的 flow
        const Flow = config.registration.type === 'copilot' ? Copilot : Cursor;
        const flow = new Flow();

        // 执行登录流程
        logger.info('正在执行登录流程...');
        const account = { email, password };
        const { browser: loginBrowser, page: loginPage } = await flow.login(browser, page, account);
        logger.info('浏览器已准备就绪，请在浏览器中完成登录');

        logger.info('正在获取登录信息...');

        // 获取 session token
        const sessionToken = await flow.getSessionToken(loginPage);
        if (!sessionToken) {
            throw new Error('获取 session token 失败');
        }
        logger.info('成功获取 session token');

        // 更新认证信息
        const success = await flow.updateAuth(
            email,
            sessionToken,
            sessionToken
        );

        if (!success) {
            throw new Error('更新认证信息失败');
        }
        logger.info('认证信息更新成功');

        // 重置机器码
        logger.info('正在重置机器码...');
        await flow.resetMachineCodes();
        logger.info('机器码重置完成');

        // 清理资源
        if (loginPage) {
            await loginPage.close();
        }
        if (loginBrowser) {
            await loginBrowser.close();
        }

        logger.info('登录流程已完成');

        res.json({
            success: true,
            message: '登录流程已完成'
        });

    } catch (error) {
        logger.error('初始化登录流程失败:', error);
        res.status(500).json({
            success: false,
            error: '初始化登录流程失败',
            message: error.message
        });
    }
});

router.post('/keepalive', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 初始化浏览器
        logger.info('正在初始化浏览器...');
        
        const config = getConfig();
        const browserInitializer = new BrowserInitializer(config);
        const { browser, page } = await browserInitializer.initBrowser();

        if (!browser || !page) {
            throw new Error('浏览器实例未初始化，请先调用初始化接口');
        }

        // 根据配置初始化对应的 flow
        const Flow = config.registration.type === 'copilot' ? Copilot : Cursor;
        const flow = new Flow();

        const account = { email, password };
        // 执行登录流程
        const { browser: loginBrowser, page: loginPage } = await flow.login(browser, page, account);
        flow.keepalive(browser, loginPage,account);
        logger.info('浏览器已准备就绪，请在浏览器中完成登录');


        // 清理资源
        if (loginPage) {
            await loginPage.close();
        }
        if (loginBrowser) {
            await loginBrowser.close();
        }

        logger.info('保活流程已经完成');

        res.json({
            success: true,
            message: '保活流程已完成'
        });

    } catch (error) {
        logger.error('初始化登录流程失败:', error);
        res.status(500).json({
            success: false,
            error: '初始化登录流程失败',
            message: error.message
        });
    }
});

module.exports = router; 