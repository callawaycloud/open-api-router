"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMiddleware = exports.initApi = void 0;
const createApi_1 = require("./createApi");
Object.defineProperty(exports, "initApi", { enumerable: true, get: function () { return createApi_1.initApi; } });
Object.defineProperty(exports, "withMiddleware", { enumerable: true, get: function () { return createApi_1.withMiddleware; } });
