/*:
 * @plugindesc For text displayed onscreen in the game.
 * @param defaultFont
 * @param defaultFontSize
 * @param defaultTextColor
 * @param defaultBorderColor
 * @param defaultBorderWidth
 * @param defaultOpacity
 * @param defaultItalic
 * @param defaultDuration
 * @param enableFlicker
 * @desc Enable flicker animation by default (true/false)
 * @default false
 */

(function() {
    var parameters = PluginManager.parameters('ScreenText');
    var defaultFont = parameters['defaultFont'];
    var defaultFontSize = Number(parameters['defaultFontSize']);
    var defaultTextColor = parameters['defaultTextColor'];
    var defaultBorderColor = parameters['defaultBorderColor'];
    var defaultBorderWidth = Number(parameters['defaultBorderWidth']);
    var defaultOpacity = Number(parameters['defaultOpacity']);
    var defaultItalic = parameters['defaultItalic'] === 'true';
    var defaultDuration = Number(parameters['defaultDuration']);
    var enableFlicker = parameters['enableFlicker'] === 'true';

    var textBoxes = {};

    Game_Screen.prototype.showTextBox = function(
        textBoxID, text, x, y, fontName, fontSize, textColor, borderColor,
        borderWidth, opacity, italic, scaleX, scaleY, origin, flicker,
        border, background, textShadow, rotation, borderStyle
    ) {
        this.eraseTextBox(textBoxID);

        fontName = fontName || defaultFont;
        fontSize = fontSize || defaultFontSize;
        textColor = textColor || defaultTextColor;
        borderColor = borderColor || defaultBorderColor;
        borderWidth = borderWidth || defaultBorderWidth;
        opacity = opacity || defaultOpacity;
        italic = italic || defaultItalic;
        scaleX = scaleX || 100;
        scaleY = scaleY || 100;
        origin = origin || 0;
        flicker = flicker !== undefined ? flicker : enableFlicker;
		border = border !== undefined ? border : `${borderWidth}px solid ${borderColor}`;
        borderStyle = borderStyle || "none";
        background = background || "transparent";
        textShadow = textShadow || "1px 2px 4px darkmagenta";
        rotation = rotation || 0;

        var textBox = document.createElement("div");
        textBox.id = "textBox_" + textBoxID;
        textBox.innerHTML = text;
        textBox.style.position = "absolute";
        textBox.style.font = (italic ? "italic " : "") + fontSize + "px " + fontName;
        textBox.style.color = textColor;
        textBox.style.border = border;
		textBox.style.borderStyle = borderStyle;
        textBox.style.opacity = opacity;
        textBox.style.zIndex = 999;
        textBox.style.background = background;
        textBox.style.textShadow = textShadow;

        var transformOrigin = "0 0";
        if (origin === 1) {
            textBox.style.left = "calc(50% + " + x + "px)";
            textBox.style.top = "calc(50% + " + y + "px)";
            transformOrigin = "50% 50%";
        } else {
            textBox.style.left = x + "px";
            textBox.style.top = y + "px";
        }
        textBox.style.transformOrigin = transformOrigin;
        textBox.style.transform = `scale(${scaleX / 100}, ${scaleY / 100}) rotate(${rotation}deg)`;

        if (flicker) {
            textBox.style.animation = "flicker 1s infinite alternate";
        }

        document.body.appendChild(textBox);
        textBoxes[textBoxID] = textBox;
    };

    Game_Screen.prototype.eraseTextBox = function(textBoxID) {
        if (textBoxes[textBoxID]) {
            document.body.removeChild(textBoxes[textBoxID]);
            delete textBoxes[textBoxID];
        }
    };

    Game_Screen.prototype.moveTextBox = function(textBoxID, x, y, textColor, opacity, duration, rotation) {
        var textBox = document.getElementById("textBox_" + textBoxID);
        if (!textBox) return;

        opacity = opacity !== undefined ? opacity : parseFloat(textBox.style.opacity);
        duration = duration || defaultDuration;
        rotation = rotation !== undefined ? rotation : 0;

        var startX = parseFloat(textBox.style.left);
        var startY = parseFloat(textBox.style.top);
        var startOpacity = parseFloat(textBox.style.opacity);
        var startTransform = textBox.style.transform;
        var startRotationMatch = startTransform.match(/rotate\(([-\d.]+)deg\)/);
        var startRotation = startRotationMatch ? parseFloat(startRotationMatch[1]) : 0;
		var startColor = textBox.style.color;

        var deltaX = x - startX;
        var deltaY = y - startY;
        var deltaOpacity = opacity - startOpacity;
        var deltaRotation = rotation - startRotation;

        var frames = 0;
        var interval = setInterval(function() {
            frames++;
            if (frames >= duration) {
                clearInterval(interval);
            }

            var progress = frames / duration;
            var currentX = startX + (deltaX * progress);
            var currentY = startY + (deltaY * progress);
            var currentOpacity = startOpacity + (deltaOpacity * progress);
            var currentRotation = startRotation + (deltaRotation * progress);

            textBox.style.left = currentX + "px";
            textBox.style.top = currentY + "px";
            textBox.style.opacity = currentOpacity / 255;
            textBox.style.color = textColor;

            var scaleMatch = textBox.style.transform.match(/scale\(([^)]+)\)/);
            var scale = scaleMatch ? scaleMatch[1] : "1, 1";
            textBox.style.transform = `scale(${scale}) rotate(${currentRotation}deg)`;
        }, 1000 / 60);
    };

    if (!document.getElementById("flickerKeyframes")) {
        const flickerCSS = `
            @keyframes flicker {
                0% { border-radius: 0.5rem; }
                100% { border-radius: 2rem; }
            }
        `;
        const styleTag = document.createElement("style");
        styleTag.id = "flickerKeyframes";
        styleTag.innerHTML = flickerCSS;
        document.head.appendChild(styleTag);
    }
})();
