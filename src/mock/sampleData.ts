import { BusinessScene, SceneType } from '../types/business';

export const sampleScenes: Record<SceneType, BusinessScene> = {
  ACCOUNT_CANCEL: {
    id: 'ACCOUNT_CANCEL',
    title: '对公账户销户申请',
    description: '核心高频场景：包含企业营业执照、销户申请书信息校验与填单',
    documentType: '企业营业执照 & 对公销户申请书',
    sampleImage: '/test_sample_license.png',
    requiredDocsNotice: [
      '《企业营业执照》正本或副本原件 (二维码需清晰)',
      '《单位撤销银行结算账户申请书》 (加盖企业公章)',
      '法定代表人与经办人有效身份证件原件'
    ],
    templateTips: '请将《营业执照》或《销户申请书》正面朝上平铺于高拍仪下方，确保18位统一信用代码及印章无遮挡。',
    fields: {}
  },
  BUSINESS_LICENSE_UPDATE: {
    id: 'BUSINESS_LICENSE_UPDATE',
    title: '单位营业执照更新备案',
    description: '营业执照法定代表人、注册资本变更备案业务处理',
    documentType: '更新后新版营业执照 / 备案登记表',
    sampleImage: '/test_license_update.png',
    requiredDocsNotice: [
      '《市场监督管理局新发企业营业执照》原件',
      '《企业名称/法定代表人变更备案登记通知书》',
      '最新章程或变更决议批复文件'
    ],
    templateTips: '请放置最新核发的营业执照或变更备案表，确保“变更后企业名称”与“新法定代表人”文字清晰。',
    fields: {}
  },
  MANAGER_CHANGE: {
    id: 'MANAGER_CHANGE',
    title: '网银管理员变更与授权',
    description: '企业网上银行主管、复核员变更及 UKEY 绑定授权',
    documentType: '网银变更申请表 & 授权委托书',
    sampleImage: '/test_netbank_change.png',
    requiredDocsNotice: [
      '《企业电子银行服务管理员变更授权申请表》',
      '《法定代表人授权委托书》 (法人签字并盖公章)',
      '新任网银管理员身份证件及预留手机号证明'
    ],
    templateTips: '请确保申请表上“单位对公账号”与“新任管理员”填报完整，且已加盖企业预留印鉴章。',
    fields: {}
  }
};
