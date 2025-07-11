"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server.ts
var express_1 = __importDefault(require("express"));
var next_1 = __importDefault(require("next"));
var url_1 = require("url");
var articles_1 = __importDefault(require("./routes/articles"));
var port = parseInt(process.env.PORT || '3000', 10);
var dev = process.env.NODE_ENV !== 'production';
var app = (0, next_1.default)({ dev: dev });
var handle = app.getRequestHandler();
app.prepare().then(function () {
    var server = (0, express_1.default)();
    // Custom API route
    server.use('/api/articles', articles_1.default);
    // Let Next.js handle everything else
    server.all('*', function (req, res) {
        var parsedUrl = (0, url_1.parse)(req.url, true);
        return handle(req, res, parsedUrl);
    });
    server.listen(port, function (err) {
        if (err)
            throw err;
        console.log("\u2705 Server ready on http://localhost:".concat(port));
    });
});
