const axios = require('axios');
const logger = require('./logger');
const StringHelper = require('./string-helper');

class AccountGenerator {
    constructor(config) {
        this.config = config;
        this.lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
        this.uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        this.numbers = '0123456789';
        this.specialChars = '!@#$%^&*';
        
        this.adjectives = [
            // 技术相关
            'swift', 'smart', 'cyber', 'digital', 'quantum', 'binary', 'crypto', 'tech', 'pixel', 'data',
            'neural', 'cloud', 'mobile', 'robot', 'atomic', 'vector', 'matrix', 'laser', 'sonic', 'nano',
            // 能力相关
            'clever', 'bright', 'quick', 'wise', 'sharp', 'keen', 'agile', 'rapid', 'fast', 'skilled',
            'talent', 'genius', 'expert', 'gifted', 'capable', 'adept', 'smart', 'savvy', 'apt', 'able',
            // 积极特质
            'happy', 'cool', 'epic', 'super', 'mega', 'ultra', 'hyper', 'prime', 'elite', 'pro'
        ];

        this.nouns = [
            // 技术角色
            'coder', 'dev', 'hacker', 'ninja', 'wizard', 'guru', 'master', 'pro', 'expert', 'ace',
            'programmer', 'developer', 'analyst', 'designer', 'admin', 'architect', 'engineer', 'techie', 'geek', 'nerd',
            // 技术领域
            'tech', 'byte', 'bit', 'data', 'code', 'algo', 'sys', 'net', 'web', 'app',
            'cloud', 'cyber', 'crypto', 'quantum', 'mobile', 'robot', 'ai', 'ml', 'db', 'api'
        ];
    }

    // 生成密码
    generatePassword(options = {}) {
        const {
            length = 15,
            includeLowercase = true,
            includeUppercase = true,
            includeNumbers = true,
            includeSpecial = true
        } = options;

        try {
            logger.info('开始生成密码...');
            
            // 初始化必需字符
            let password = [];
            if (includeLowercase) {
                password.push(this.getRandomChar(this.lowercaseChars));
            }
            if (includeUppercase) {
                password.push(this.getRandomChar(this.uppercaseChars));
            }
            if (includeNumbers) {
                password.push(this.getRandomChar(this.numbers));
            }
            if (includeSpecial) {
                password.push(this.getRandomChar(this.specialChars));
            }

            // 构建可用字符集
            let allChars = '';
            if (includeLowercase) allChars += this.lowercaseChars;
            if (includeUppercase) allChars += this.uppercaseChars;
            if (includeNumbers) allChars += this.numbers;
            if (includeSpecial) allChars += this.specialChars;

            // 生成剩余字符
            for (let i = password.length; i < length; i++) {
                password.push(this.getRandomChar(allChars));
            }

            // 打乱密码字符顺序
            password = this.shuffle(password);

            const result = password.join('');
            logger.info('密码生成完成');
            return result;
        } catch (error) {
            logger.error('生成密码时出错:', error);
            throw error;
        }
    }

    // 生成随机数字
    generateNumber() {
        return Math.floor(Math.random() * 9999).toString();
    }

    // 获取随机词
    getRandomWord() {
        const useAdjective = Math.random() < 0.5;
        const words = useAdjective ? this.adjectives : this.nouns;
        return words[Math.floor(Math.random() * words.length)];
    }

    // 生成用户名
    generateUsername() {
        // 随机决定生成3-4个组合
        const partCount = Math.floor(Math.random() * 2) + 3; // 3-4
        const parts = [];
        
        // 生成模式的可能性
        const patterns = {
            3: [
                ['word', 'number', 'word'],
                ['word', 'number', 'number'],
                ['word', 'word', 'number']
            ],
            4: [
                ['word', 'number', 'word', 'number'],
                ['word', 'word', 'word', 'number'],
                ['word', 'number', 'word', 'word'],
                ['word', 'word', 'number', 'word']
            ]
        };

        // 随机选择一个模式
        const possiblePatterns = patterns[partCount];
        const selectedPattern = possiblePatterns[Math.floor(Math.random() * possiblePatterns.length)];

        // 根据选择的模式生成用户名
        selectedPattern.forEach(type => {
            if (type === 'number') {
                parts.push(this.generateNumber());
            } else {
                parts.push(this.getRandomWord());
            }
        });

        const logInfo = {
            pattern: selectedPattern,
            parts: parts
        };
        logger.info('生成用户名模式:\n' + StringHelper.formatJsonToLines(logInfo));
        return parts.join('');
    }

    // 获取用户名
    async getAvailableUsername() {
        const username = this.generateUsername();
        logger.info('生成用户名:', username);
        return username;
    }

    // 生成随机的 firstname
    generateFirstname() {
        const randomIndex = Math.floor(Math.random() * this.adjectives.length);
        const firstname = this.adjectives[randomIndex];
        const capitalizedFirstname = firstname.charAt(0).toUpperCase() + firstname.slice(1);
        logger.info('生成 firstname:', capitalizedFirstname);
        return capitalizedFirstname;
    }

    // 生成随机的 lastname
    generateLastname() {
        const randomIndex = Math.floor(Math.random() * this.nouns.length);
        const lastname = this.nouns[randomIndex];
        const capitalizedLastname = lastname.charAt(0).toUpperCase() + lastname.slice(1);
        logger.info('生成 lastname:', capitalizedLastname);
        return capitalizedLastname;
    }

    // 获取随机字符
    getRandomChar(chars) {
        return chars[Math.floor(Math.random() * chars.length)];
    }

    // Fisher-Yates 洗牌算法
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
   
    // 生成完整账号信息
    async generateAccount() {
        try {
            logger.info('开始生成账号信息...');
            
            const username = await this.getAvailableUsername();
            const password = this.generatePassword();
            const firstname = this.generateFirstname();
            const lastname = this.generateLastname();
            const email = `${username}${this.config.cloudflare.virtualDomain}`;

            const account = {
                username,
                email,
                password,
                firstname,
                lastname
            };

            logger.info('账号信息生成完成:\n' + StringHelper.formatJsonToLines(account));
            return account;
        } catch (error) {
            logger.error('生成账号信息失败:', error);
            throw error;
        }
    }

    async generateBio() {
        try {
            logger.info('开始生成个人简介...');
            
            // 简介模板
            const templates = [
                "I'm a {{adj}} {{noun}} enthusiast who loves {{verb}} {{object}}.",
                "{{adj}} {{noun}} developer with passion for {{object}}.",
                "Working on {{object}} with {{adj}} technologies.",
                "{{verb}} {{object}} using {{adj}} approaches.",
                "{{adj}} {{noun}} looking to collaborate on {{object}}.",
                "Interested in {{object}} and {{adj}} {{noun}} development."
            ];
            
            // 动词列表
            const verbs = [
                'building', 'creating', 'developing', 'designing', 'exploring',
                'learning', 'studying', 'researching', 'optimizing', 'improving'
            ];
            
            // 对象列表
            const objects = [
                'web applications', 'mobile apps', 'AI systems', 'cloud solutions',
                'open source projects', 'data science', 'machine learning models',
                'blockchain technology', 'IoT devices', 'cybersecurity tools',
                'game development', 'UI/UX design', 'automation tools'
            ];
            
            // 随机选择模板
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            // 替换模板中的占位符
            const bio = template
                .replace('{{adj}}', this.adjectives[Math.floor(Math.random() * this.adjectives.length)])
                .replace('{{noun}}', this.nouns[Math.floor(Math.random() * this.nouns.length)])
                .replace('{{verb}}', verbs[Math.floor(Math.random() * verbs.length)])
                .replace('{{object}}', objects[Math.floor(Math.random() * objects.length)]);
            
            logger.info('个人简介生成完成:', bio);
            return bio;
        } catch (error) {
            logger.error('生成个人简介失败:', error);
            // 出错时返回一个简单的默认值
            return "Software developer interested in new technologies.";
        }
    }

    async  generateCompany() {
        try {
            const prefixes = ['Tech', 'Digital', 'Cyber', 'Cloud', 'Data', 'AI', 'Web', 'Mobile', 'Smart', 'Future'];
            const suffixes = ['Solutions', 'Systems', 'Labs', 'Technologies', 'Group', 'Inc', 'Co', 'Studio', 'Works', 'Hub'];
            
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            
            const company = `${prefix} ${suffix}`;
            logger.info('生成公司名称:', company);
            return company;
        } catch (error) {
            logger.error('生成公司名称失败:', error);
            return "Tech Company";
        }
    }

    async  generateLocation() {
        try {
            const cities = [
                'San Francisco', 'New York', 'London', 'Berlin', 'Tokyo', 
                'Singapore', 'Sydney', 'Toronto', 'Amsterdam', 'Stockholm',
                'Helsinki', 'Oslo', 'Copenhagen', 'Seoul', 'Taipei',
                'Remote'
            ];
            
            const location = cities[Math.floor(Math.random() * cities.length)];
            logger.info('生成位置信息:', location);
            return location;
        } catch (error) {
            logger.error('生成位置信息失败:', error);
            return "Remote";
        }
    }
}

module.exports = AccountGenerator; 