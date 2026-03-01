# BGM 音频目录

将 BGM 文件放在此目录下，**文件名**与情绪标签对应后，游戏会根据剧情自动切换：

| 文件名      | 情绪标签 | 说明       |
|------------|----------|------------|
| `calm.mp3` | calm     | 舒缓       |
| `tense.mp3`| tense    | 紧张       |
| `mystery.mp3` | mystery | 悬疑     |
| `action.mp3`  | action  | 激烈/战斗  |
| `sad.mp3`     | sad     | 悲伤     |

- 格式建议：**MP3** 或 **OGG**，体积适中以便加载。
- 若某个情绪暂无文件，可不放该文件，该标签下不会播放声音；BGM 开关仍在左上角可点击。
- 需要增加新情绪或改用其他文件名时，请修改 `frontend/src/components/GameBgm.vue` 中的 `trackMap` 对象。
