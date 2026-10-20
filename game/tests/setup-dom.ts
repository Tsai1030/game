import { GlobalRegistrator } from '@happy-dom/global-registrator';

// 讓 DOM 相關的測試（介面、applyDom）可以在 bun test 裡執行。
GlobalRegistrator.register();
