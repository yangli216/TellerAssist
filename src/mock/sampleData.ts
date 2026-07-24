import { BusinessScene, SceneType } from '../types/business';

// 动态生成高清测试图 SVG DataURL
const createSampleDocSvg = (title: string, subtitle: string, items: Array<{ label: string; value: string; color?: string }>) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1050" width="100%" height="100%">
      <rect width="800" height="1050" fill="#fcfcfd" rx="12"/>
      <rect x="20" y="20" width="760" height="1010" fill="none" stroke="#d0d7de" stroke-width="2" stroke-dasharray="6,4" rx="8"/>
      
      <!-- 国徽/标志 占位图案 -->
      <circle cx="400" cy="90" r="32" fill="#c93b2b" opacity="0.9"/>
      <polygon points="400,68 408,86 428,88 412,100 417,118 400,107 383,118 388,100 372,88 392,86" fill="#fbd38d"/>
      
      <!-- 标题 -->
      <text x="400" y="150" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="bold" fill="#1f2937" text-anchor="middle" letter-spacing="2">${title}</text>
      <text x="400" y="180" font-family="sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">${subtitle}</text>

      <line x1="60" y1="205" x2="740" y2="205" stroke="#e5e7eb" stroke-width="2"/>

      <!-- 二维码模拟 -->
      <rect x="650" y="50" width="90" height="90" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5"/>
      <path d="M660 60h20v20h-20zM710 60h20v20h-20zM660 110h20v20h-20zM690 90h15v15h-15zM715 105h15v25h-15z" fill="#374151"/>

      <!-- 内容条目表格 -->
      ${items.map((item, idx) => {
        const y = 240 + idx * 85;
        return `
          <g>
            <rect x="60" y="${y}" width="680" height="68" fill="#f9fafb" stroke="#e5e7eb" rx="6"/>
            <text x="85" y="${y + 28}" font-family="sans-serif" font-size="14" font-weight="600" fill="#4b5563">${item.label}</text>
            <text x="85" y="${y + 52}" font-family="monospace" font-size="16" font-weight="bold" fill="${item.color || '#111827'}">${item.value}</text>
          </g>
        `;
      }).join('')}

      <!-- 模拟公章 -->
      <circle cx="620" cy="850" r="70" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-dasharray="30, 2" opacity="0.85"/>
      <text x="620" y="845" font-family="sans-serif" font-size="13" font-weight="bold" fill="#dc2626" text-anchor="middle" opacity="0.9">浙江省市场监督管理局</text>
      <text x="620" y="870" font-family="sans-serif" font-size="11" fill="#dc2626" text-anchor="middle" opacity="0.8">★ 审核专用章 ★</text>

      <!-- 底部防伪编码 -->
      <text x="60" y="1000" font-family="monospace" font-size="12" fill="#9ca3af">NO. 88374920148-HANGZHOU-BANK-VERIFIED</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const sampleScenes: Record<SceneType, BusinessScene> = {
  ACCOUNT_CANCEL: {
    id: 'ACCOUNT_CANCEL',
    title: '对公账户销户申请',
    description: '核心高频场景：包含企业营业执照、销户申请书信息校验与填单',
    documentType: '营业执照 & 销户申请书',
    sampleImage: createSampleDocSvg(
      '中华人民共和国 营业执照',
      '统一社会信用代码与企业基本信息档案',
      [
        { label: '统一社会信用代码', value: '91330108MA27XXXXX9', color: '#10b981' },
        { label: '企业名称', value: '杭州智晓科技股份有限公司' },
        { label: '法定代表人', value: '张三 (33010619850312XXXX)' },
        { label: '销户对公账号', value: '6222023602008899123' },
        { label: '销户原因', value: '公司架构重组与账户合并销户' },
        { label: '经办人姓名与电话', value: '李四 / 13800138000' }
      ]
    ),
    fields: {
      uscc: {
        id: 'uscc',
        label: '统一社会信用代码',
        value: '91330108MA27XXXXX9',
        ocrValue: '91330108MA27XXXXX9',
        hostValue: '91330108MA27XXXXX9',
        source: 'OCR',
        confidence: 0.99,
        bbox: { x: 7.5, y: 22.8, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '18位代码格式正确，校验位比对通过，行内主数据完全一致',
        userModified: false,
      },
      companyName: {
        id: 'companyName',
        label: '企业名称',
        value: '杭州智晓科技股份有限公司',
        ocrValue: '杭州智晓科枝股份有限公司', // 模拟 OCR 出现形近字错字
        hostValue: '杭州智晓科技股份有限公司',
        source: 'HOST',
        confidence: 0.88,
        bbox: { x: 7.5, y: 31.0, width: 85, height: 6.5 },
        status: 'CONFLICT',
        ruleMessage: 'OCR识别为“科枝”，与核心系统“科技”不匹配，已自动推荐核心系统官方户名',
        userModified: true,
      },
      legalPerson: {
        id: 'legalPerson',
        label: '法定代表人',
        value: '张三',
        ocrValue: '张三',
        hostValue: '张三',
        source: 'OCR',
        confidence: 0.96,
        bbox: { x: 7.5, y: 39.0, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '身份信息校验通过',
        userModified: false,
      },
      accountNo: {
        id: 'accountNo',
        label: '销户对公账号',
        value: '6222023602008899123',
        ocrValue: '6222023602008899123',
        hostValue: '6222023602008899123',
        source: 'HOST',
        confidence: 0.94,
        bbox: { x: 7.5, y: 47.1, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '账号状态：正常，允许办理销户',
        userModified: false,
      },
      cancelReason: {
        id: 'cancelReason',
        label: '销户原因描述',
        value: '公司架构重组与账户合并销户',
        ocrValue: '公司架构重组与账户合并销户',
        source: 'OCR',
        confidence: 0.81,
        bbox: { x: 7.5, y: 55.2, width: 85, height: 6.5 },
        status: 'REVIEW',
        ruleMessage: '低置信度文本，请柜员核对原因是否属于标准销户原因列表',
        userModified: false,
      },
      agentName: {
        id: 'agentName',
        label: '经办人信息',
        value: '李四 / 13800138000',
        ocrValue: '李四 / 13800138000',
        source: 'OCR',
        confidence: 0.95,
        bbox: { x: 7.5, y: 63.3, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '经办人身份证及联系方式已校验',
        userModified: false,
      }
    }
  },
  BUSINESS_LICENSE_UPDATE: {
    id: 'BUSINESS_LICENSE_UPDATE',
    title: '单位营业执照更新备案',
    description: '企业执照到期或信息变更后的柜面快速档案更新',
    documentType: '新版营业执照',
    sampleImage: createSampleDocSvg(
      '营业执照 (信息更新专用)',
      '企业登记机关最新核发资质证照',
      [
        { label: '统一社会信用代码', value: '91330106MA28YYYYY3', color: '#10b981' },
        { label: '企业名称', value: '浙江高新云算技术有限公司' },
        { label: '住所地址', value: '杭州市滨江区科技一路88号3幢601室' },
        { label: '注册资本', value: '5000.00万人民币' },
        { label: '营业期限', value: '2020-05-18 至 2050-05-17' }
      ]
    ),
    fields: {
      uscc: {
        id: 'uscc',
        label: '统一社会信用代码',
        value: '91330106MA28YYYYY3',
        ocrValue: '91330106MA28YYYYY3',
        source: 'OCR',
        confidence: 0.99,
        bbox: { x: 7.5, y: 22.8, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '校验位正确',
        userModified: false,
      },
      companyName: {
        id: 'companyName',
        label: '企业名称',
        value: '浙江高新云算技术有限公司',
        ocrValue: '浙江高新云算技术有限公司',
        source: 'OCR',
        confidence: 0.97,
        bbox: { x: 7.5, y: 31.0, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '核准名称无误',
        userModified: false,
      },
      address: {
        id: 'address',
        label: '住所地址',
        value: '杭州市滨江区科技一路88号3幢601室',
        ocrValue: '杭州市滨江区科技一路88号3幢601室',
        source: 'OCR',
        confidence: 0.92,
        bbox: { x: 7.5, y: 39.0, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '标准地址解析通过',
        userModified: false,
      },
      regCapital: {
        id: 'regCapital',
        label: '注册资本',
        value: '5000.00万人民币',
        ocrValue: '5000.00万人民币',
        source: 'OCR',
        confidence: 0.95,
        bbox: { x: 7.5, y: 47.1, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '币种金额提取正常',
        userModified: false,
      }
    }
  },
  MANAGER_CHANGE: {
    id: 'MANAGER_CHANGE',
    title: '企业网银管理员变更',
    description: '网银管理员更换及授权委托书验证',
    documentType: '网银变更申请表 & 授权书',
    sampleImage: createSampleDocSvg(
      '企业网银管理员变更申请书',
      '电子银行服务变更与权限授权文件',
      [
        { label: '企业对公账号', value: '6222099901828833019' },
        { label: '原管理员姓名', value: '王五 (撤销权限)' },
        { label: '新管理员姓名', value: '赵六 (33010219901102XXXX)' },
        { label: '手机动态口令绑定号', value: '13911223344' }
      ]
    ),
    fields: {
      accountNo: {
        id: 'accountNo',
        label: '企业对公账号',
        value: '6222099901828833019',
        ocrValue: '6222099901828833019',
        source: 'OCR',
        confidence: 0.98,
        bbox: { x: 7.5, y: 22.8, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '网银签约状态正常',
        userModified: false,
      },
      oldManager: {
        id: 'oldManager',
        label: '原管理员姓名',
        value: '王五',
        ocrValue: '王五',
        source: 'OCR',
        confidence: 0.95,
        bbox: { x: 7.5, y: 31.0, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '原管理员校验匹配',
        userModified: false,
      },
      newManager: {
        id: 'newManager',
        label: '新管理员姓名',
        value: '赵六',
        ocrValue: '赵六',
        source: 'OCR',
        confidence: 0.96,
        bbox: { x: 7.5, y: 39.0, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '新管理员身份已核实',
        userModified: false,
      },
      mobile: {
        id: 'mobile',
        label: '绑定手机号',
        value: '13911223344',
        ocrValue: '13911223344',
        source: 'OCR',
        confidence: 0.99,
        bbox: { x: 7.5, y: 47.1, width: 85, height: 6.5 },
        status: 'PASSED',
        ruleMessage: '手机号段合法',
        userModified: false,
      }
    }
  }
};
