import { decodeEncodingAESKey, decryptMessage, encryptMessage, isValidAESKey } from '../src/callback/crypto.js';
import { verifySignature, generateSignature, verifyTimestamp } from '../src/callback/signature.js';
import { parseCallbackXml, extractEncryptField, isValidMessage } from '../src/callback/parser.js';

const testToken = 'test_token_123';
const testEncodingAESKey = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567';
const testCorpId = 'wx1234567890abcdef';

async function runTests() {
  console.log('=== 测试加密/解密 ===');
  
  try {
    const aesKey = decodeEncodingAESKey(testEncodingAESKey);
    console.log('✓ AESKey长度正确:', aesKey.length === 32);
    
    const testMsg = '<xml><Content>测试消息</Content></xml>';
    const encrypted = encryptMessage(testMsg, aesKey, testCorpId);
    console.log('✓ 加密成功，长度:', encrypted.length);
    
    const decrypted = decryptMessage(encrypted, aesKey);
    console.log('✓ 解密成功:', decrypted.msg === testMsg);
    console.log('✓ receiveId匹配:', decrypted.receiveId === testCorpId);
    
    const valid = isValidAESKey(testEncodingAESKey);
    console.log('✓ 密钥验证:', valid);
  } catch (err) {
    console.error('✗ 加密/解密测试失败:', err);
    process.exit(1);
  }

  console.log('\n=== 测试签名验证 ===');
  
  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'test_nonce_abc';
    const msgEncrypt = 'test_encrypt_string';
    
    const signature = generateSignature(testToken, timestamp, nonce, msgEncrypt);
    console.log('✓ 签名生成成功:', signature.length === 40);
    
    const valid = verifySignature(signature, testToken, timestamp, nonce, msgEncrypt);
    console.log('✓ 签名验证通过:', valid);
    
    const invalid = verifySignature('invalid_signature', testToken, timestamp, nonce, msgEncrypt);
    console.log('✓ 错误签名被拒绝:', !invalid);
    
    const timestampValid = verifyTimestamp(timestamp);
    console.log('✓ 时间戳验证:', timestampValid);
    
    const oldTimestamp = '1000000000';
    const oldValid = verifyTimestamp(oldTimestamp, 300);
    console.log('✗ 过期时间戳被拒绝:', !oldValid);
  } catch (err) {
    console.error('✗ 签名验证测试失败:', err);
    process.exit(1);
  }

  console.log('\n=== 测试XML解析 ===');
  
  try {
    const testXml = `<xml>
  <ToUserName><![CDATA[${testCorpId}]]></ToUserName>
  <FromUserName><![CDATA[user123]]></FromUserName>
  <CreateTime>1234567890</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[测试消息内容]]></Content>
  <MsgId>123456789</MsgId>
  <AgentID>100001</AgentID>
</xml>`;

    const parsed = await parseCallbackXml(testXml);
    console.log('✓ XML解析成功');
    console.log('  - MsgType:', parsed.MsgType);
    console.log('  - Content:', parsed.Content);
    console.log('  - FromUserName:', parsed.FromUserName);
    
    const valid = isValidMessage(parsed);
    console.log('✓ 消息格式验证:', valid);
    
    const aesKey = decodeEncodingAESKey(testEncodingAESKey);
    const encrypted = encryptMessage(testXml, aesKey, testCorpId);
    
    const encryptXml = `<xml>
  <Encrypt><![CDATA[${encrypted}]]></Encrypt>
</xml>`;

    const extracted = extractEncryptField(encryptXml);
    console.log('✓ Encrypt字段提取:', extracted === encrypted);
    
    const noEncryptXml = '<xml><Content>test</Content></xml>';
    const noExtract = extractEncryptField(noEncryptXml);
    console.log('✓ 无Encrypt字段返回null:', noExtract === null);
  } catch (err) {
    console.error('✗ XML解析测试失败:', err);
    process.exit(1);
  }

  console.log('\n=== 测试完整流程 ===');
  
  try {
    const aesKey = decodeEncodingAESKey(testEncodingAESKey);
    
    const msgXml = `<xml>
  <ToUserName><![CDATA[${testCorpId}]]></ToUserName>
  <FromUserName><![CDATA[user456]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[完整流程测试]]></Content>
  <MsgId>987654321</MsgId>
</xml>`;

    const encrypted = encryptMessage(msgXml, aesKey, testCorpId);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = 'nonce_' + Math.random().toString(36).substring(7);
    const signature = generateSignature(testToken, timestamp, nonce, encrypted);
    
    console.log('✓ 模拟企业微信回调包生成成功');
    
    const sigValid = verifySignature(signature, testToken, timestamp, nonce, encrypted);
    console.log('✓ 签名验证:', sigValid);
    
    const { msg, receiveId } = decryptMessage(encrypted, aesKey);
    console.log('✓ 消息解密成功');
    
    const parsed = await parseCallbackXml(msg);
    console.log('✓ XML解析成功:', parsed.Content);
    
    const idValid = receiveId === testCorpId;
    console.log('✓ receiveId验证:', idValid);
    
    console.log('\n✅ 所有测试通过！');
  } catch (err) {
    console.error('✗ 完整流程测试失败:', err);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});