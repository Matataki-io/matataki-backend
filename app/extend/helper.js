const generate = require('nanoid/generate');

module.exports = {
  // 生成0-9A-Za-z的随机字符串
  genCharacterNumber(length) {
    return generate('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', length);
  },
  emailMask(str) {
    if (str === null) {
      return '';
    }
    str = str.toString();
    return str.replace(
      /(?<=.)[^@\n](?=[^@\n]*?@)|(?:(?<=@.)|(?!^)\G(?=[^@\n]*$)).(?=.*\.)/gm,
      '*');
  },
  // 随机数
  randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  },
};
