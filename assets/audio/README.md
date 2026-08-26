# assets/audio/ 资源目录组织说明

本目录存放本地音频资源（MP3），供「萌星宝宝·幼小衔接」跨端离线播放使用。
`content.js` 的播放优先级为：**本地 MP3 → 音频缓存 → Web Speech TTS 兜底**。

## 目录结构（建议）

```
assets/audio/
├── pinyin/      拼音及汉字音节发音      → b.mp3, mā.mp3, shān.mp3, hēi.mp3
├── english/     英文单词/自然拼读发音   → cat.mp3, dog.mp3, sun.mp3, pig.mp3
├── poem/        古诗范读（整首朗读）    → 静夜思.mp3, 春晓.mp3, 咏鹅.mp3
└── music/       儿歌 / 熏听音频         → twinkle-twinkle.mp3, 儿歌-小星星.mp3
```

## 命名规则

- 文件名 = 发音内容，与学习卡片上的文本/拼音一一对应。
- 中文音节（拼音卡片）放入 `pinyin/`，如 `bà.mp3`、`mā.mp3`。
- 英文单词放入 `english/`，如 `cat.mp3`；支持自然拼读逐字母。
- 古诗以《标题》命名放入 `poem/`；儿歌放入 `music/`。
- 文件名可直接为中文，浏览器会自动编码，也可使用 `encodeURIComponent` 兼容名。

## 可选：音频清单（推荐用于离线判存）

在 `index.html` 的 `<script>` 中，先于 `js/content.js` 声明存在的音频文件清单，
可让播放器在点击时**无需发网络请求**即可判断是否有本地音频，没有则直接回退 TTS：

```html
<script>
  window.MX_AUDIO_FILES = [
    "pinyin/b.mp3", "pinyin/mā.mp3",
    "english/cat.mp3", "english/dog.mp3",
    "poem/静夜思.mp3", "poem/春晓.mp3"
  ];
</script>
```

若未提供该清单，播放器会先尝试 HEAD 探测本地文件，失败再回退 TTS，功能不受影响。

## 放音频的两种方式

1. **直接放入本目录**，并按命名规则命名 → 播放器自动命中本地播放（离线可用）。
2. **从网盘下载后缓存**：资源通过 `DB.saveLocalFile()` 写入 IndexedDB/Cache，
   播放时由 `DB.hasLocalCache()` 判定命中缓存。

> 提示：大批量 MP3 请保持「文件名不改名 + 哈希 resource_id」策略，
> 通过 `seed_resource.json` 的 `localPath` 字段让 resource 关联到本目录下的文件。
