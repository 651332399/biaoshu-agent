import { afterEach, describe, expect, test } from 'vitest';
import { apiUrl, getApiBase, setApiBase } from './apiBase';

afterEach(() => setApiBase(''));

describe('apiBase', () => {
  test('部署子路径统一前缀，根路径恢复默认行为', () => {
    setApiBase('/biaoshu/');
    expect(apiUrl('/api/projects')).toBe('/biaoshu/api/projects');
    expect(apiUrl('/api/projects/p1/events?last_event_id=42')).toBe('/biaoshu/api/projects/p1/events?last_event_id=42');
    expect(apiUrl('https://cos.example.com/bid.zip')).toBe('https://cos.example.com/bid.zip');
    setApiBase('/');
    expect(apiUrl('/api/projects')).toBe('/api/projects');
  });

  test('默认同源：路径原样返回，浏览器端行为不变', () => {
    expect(getApiBase()).toBe('');
    expect(apiUrl('/api/projects')).toBe('/api/projects');
  });

  test('设了基地址就拼上去', () => {
    setApiBase('http://127.0.0.1:8000');
    expect(apiUrl('/api/projects')).toBe('http://127.0.0.1:8000/api/projects');
  });

  test('末尾斜杠不会拼出 //api', () => {
    setApiBase('http://127.0.0.1:8000///');
    expect(apiUrl('/api/projects')).toBe('http://127.0.0.1:8000/api/projects');
  });

  test('绝对地址原样返回——预签名上传地址指向对象存储，套基地址会打错目标', () => {
    setApiBase('http://127.0.0.1:8000');
    const presigned = 'https://cos.example.com/bucket/obj?sig=abc';
    expect(apiUrl(presigned)).toBe(presigned);
  });
});
