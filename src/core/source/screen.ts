/// <reference path="../../../defs/es6-promise.d.ts" />

import {exec} from '../../internal/internal';
import {applyMixins} from '../../internal/util/mixin';
import {Item as iItem} from '../../internal/item';
import {App as iApp} from '../../internal/app';
import {ItemLayout, IItemLayout} from './ilayout';
import {ItemColor, IItemColor} from './icolor';
import {ItemChroma, IItemChroma, KeyingType, ChromaPrimaryColors,
ChromaAntiAliasLevel} from './ichroma';
import {ItemTransition, IItemTransition} from './itransition';
import {Source} from './source';
import {Scene} from '../scene';
import {Transition} from '../transition';
import {Rectangle} from '../../util/rectangle';
import {Color} from '../../util/color';
import {Environment} from '../environment';
import {JSON as JXON} from '../../internal/util/json';
import {XML} from '../../internal/util/xml';

/**
 * The ScreenSource class represents a screen capture item.
 *
 * Inherits from: {@link #core/Source Core/Source}
 *
 *  All methods marked as *Chainable* resolve with the original `ScreenSource`
 *  instance.
 */
export class ScreenSource extends Source implements IItemLayout, IItemColor, IItemChroma, IItemTransition {
  /**
   * return: Promise<Rectangle>
   *
   * Gets the Capture Area of the Screen Capture Item. Returns a Rectangle
   * object.
   *
   * See also: {@link #util/Rectangle Util/Rectangle}
   */
   getCaptureArea(): Promise<Rectangle> {
    return new Promise(resolve => {
      this.getValue().then(val => {
        if (!(val instanceof XML)) {
          resolve(Rectangle.fromCoordinates(0, 0, 0, 0));
        } else {
          let _value: JXON = JXON.parse(val);
          resolve(Rectangle.fromCoordinates(
            Number(_value['left']),
            Number(_value['top']),
            Number(_value['width']) + Number(_value['left']),
            Number(_value['height']) + Number(_value['top'])
          ));
        }
      });
    });
  }

  /**
   * param: Promise<Rectangle>
   * ```
   * return: Promise<ScreenSource>
   * ```
   *
   * Sets the Window Capture Area of the Screen Capture Item.
   *
   * *Chainable.*
   *
   * See also: {@link #util/Rectangle Util/Rectangle}
   */
  setCaptureArea(dimension: Rectangle): Promise<ScreenSource> {
    return new Promise(resolve => {
      this.getValue().then(val => {
        return new Promise(iResolve => {
          iItem.get('screenresolution', this._id).then(res => {
            let _res = res.split(',');
            iResolve({
              value : val,
              res : Rectangle.fromCoordinates(
                Number(_res[0]),
                Number(_res[1]),
                Number(_res[2]),
                Number(_res[3])
              )
            });
          });
        });
      }).then((obj: { value: any, res: Rectangle }) => {
        let _config = new JXON();

        if (!(obj.value instanceof XML)) {
          _config['tag'] = 'screen';
          _config['module'] = '';
          _config['window'] = '';
          _config['hwnd'] = '0';
          _config['wclient'] = '0';
          _config['left'] = '0';
          _config['top'] = '0';
          _config['width'] = '0';
          _config['height'] = '0';
        } else {
          _config = JXON.parse(obj.value);
        }

        _config['left'] = dimension.getLeft() >= obj.res.getLeft() ?
          dimension.getLeft() : Number(_config['left']) >= obj.res.getLeft() ?
            _config['left'] : obj.res.getLeft();
        _config['top'] = dimension.getTop() >= obj.res.getTop() ?
          dimension.getTop() : Number(_config['top']) >= obj.res.getTop() ?
            _config['top'] : obj.res.getTop();
        _config['width'] = dimension.getWidth() <= obj.res.getWidth() ?
          dimension.getWidth() : Number(_config['width']) <=
            obj.res.getWidth() ? _config['width'] : obj.res.getWidth();
        _config['height'] = dimension.getHeight() <= obj.res.getHeight() ?
          dimension.getHeight() : Number(_config['height']) <=
            obj.res.getHeight() ? _config['height'] : obj.res.getHeight();

        this.setValue(XML.parseJSON(_config)).then(() => {
          resolve(this);
        });
      });
    });
  }

  /**
   * return: Promise<boolean>
   *
   * Checks if the Screen Capture Item only captures the
   * Client area (does not capture the title bar, menu bar, window border, etc.)
   */
  isClientArea(): Promise<boolean> {
    return new Promise(resolve => {
      this.getValue().then(val => {
        if (!(val instanceof XML)) {
          resolve(false);
        } else {
          let _value: JXON = JXON.parse(val);
          resolve(_value['wclient'] === '1');
        }
      });
    });
  }

  /**
   * param: Promise<boolean>
   * ```
   * return: Promise<ScreenSource>
   * ```
   *
   * Set the Screen Capture to capture the Client area only or include
   * the titlebar, menu bar, window border, etc.
   */
  setClientArea(value: boolean): Promise<ScreenSource> {
    return new Promise(resolve => {
      this.getValue().then(val => {
        let _config = new JXON();

        if (!(val instanceof XML)) {
          _config['tag'] = 'screen';
          _config['module'] = '';
          _config['window'] = '';
          _config['hwnd'] = '0';
          _config['wclient'] = '0';
          _config['left'] = '0';
          _config['top'] = '0';
          _config['width'] = '0';
          _config['height'] = '0';
        } else {
          _config = JXON.parse(val);
        }

        _config['wclient'] = (value ? '1' : '0');

        this.setValue(XML.parseJSON(_config)).then(() => {
          resolve(this);
        })
      });
    });
  }

  /**
   * return: Promise<boolean>
   *
   * Checks if the Screen Capture Item captures a window based on
   * the window's title.
   */
  isStickToTitle(): Promise<boolean> {
    return new Promise(resolve => {
      iItem.get('prop:ScrCapTrackWindowTitle', this._id).then(val => {
        resolve(val === '0');
      });
    });
  }

  /**
   * param: Promise<boolean>
   * ```
   * return: Promise<ScreenSource>
   * ```
   *
   * Set the Screen Capture to capture the window based on the window title.
   * Useful when capturing programs with multiple tabs, for you to only
   * capture a particular tab.
   */
  setStickToTitle(value: boolean): Promise<ScreenSource> {
    return new Promise(resolve => {
      iItem.set('prop:ScrCapTrackWindowTitle', value ? '0' : '1', this._id)
        .then(() => {
          resolve(this);
        });
    });
  }

  // ItemLayout

  /**
   * return: Promise<boolean>
   *
   * Check if Aspect Ratio is set to ON or OFF
   */
  isKeepAspectRatio: () => Promise<boolean>;

  /**
   * return: Promise<boolean>
   *
   * Check if Position Locked is set to ON or OFF
   */
  isPositionLocked: () => Promise<boolean>;

  /**
   * return: Promise<boolean>
   *
   * Check if Enhance Resize is Enabled or Disabled
   */
  isEnhancedResizeEnabled: () => Promise<boolean>;

  /**
   * return: Promise<Rectangle>
   *
   * Get the position of the item
   *
   * See also: {@link #util/Rectangle Util/Rectangle}
   */
  getPosition: () => Promise<Rectangle>;

  /**
   * return: Promise<number>
   *
   * Get Rotate Y value of the item
   */
  getRotateY: () => Promise<number>;

  /**
   * return: Promise<number>
   *
   * Get Rotate X value of the item
   */
  getRotateX: () => Promise<number>;

  /**
   * return: Promise<number>
   *
   * Get Rotate Z value of the item
   */
  getRotateZ: () => Promise<number>;

  /**
   * param: (value: boolean)
   *
   * Set Aspect Ratio to ON or OFF
   *
   * *Chainable.*
   */
  setKeepAspectRatio: (value: boolean) => Promise<ScreenSource>;

  /**
   * param: (value: boolean)
   *
   * Set Position Lock to ON or OFF
   *
   * *Chainable.*
   */
  setPositionLocked: (value: boolean) => Promise<ScreenSource>;

  /**
   * param: (value: boolean)
   *
   * Set Enhance Resize to ON or OFF
   *
   * *Chainable.*
   */
  setEnhancedResizeEnabled: (value: boolean) => Promise<ScreenSource>;

  /**
   * param: (value: Rectangle)
   *
   * Set Item Position. Relative coordinates (0-1) are required.
   *
   * *Chainable.*
   *
   * #### Usage
   *
   * ```javascript
   * var rect = xjs.Rectangle.fromCoordinates(0, 0, 1, 1);
   * item.setPosition(rect).then(function(item) {
   *   // Promise resolves with same Item instance
   * });
   * ```
   *
   * See also: {@link #util/Rectangle Util/Rectangle}
   */
  setPosition: (value: Rectangle) => Promise<ScreenSource>;

  /**
   * param: (value: number)
   *
   * Set Rotate Y value of the item
   *
   * *Chainable.*
   */
  setRotateY: (value: number) => Promise<ScreenSource>;

  /**
   * param: (value: number)
   *
   * Set Rotate X value of the item
   *
   * *Chainable.*
   */
  setRotateX: (value: number) => Promise<ScreenSource>;

  /**
   * param: (value: number)
   *
   * Set Rotate Z value of the item
   *
   * *Chainable.*
   */
  setRotateZ: (value: number) => Promise<ScreenSource>;

  // ItemColor

  /**
   * return: Promise<number>
   *
   * Get Item Transparency value
   */
  getTransparency: () => Promise<number>;

  /**
   * return: Promise<number>
   *
   * Get Item Brightness value
   */
  getBrightness: () => Promise<number>;

  /**
   * return: Promise<number>
   *
   * Get Item Contrast value
   */
  getContrast: () => Promise<number>;

  /**
   * return: Promise<number>
   *
   * Get Item Hue value
   */
  getHue: () => Promise<number>;

  /**
   * return: Promise<number>
   *
   * Get Item Saturation value
   */
  getSaturation: () => Promise<number>;

  /**
   * return: Promise<Color>
   *
   * Get Border Color
   */
  getBorderColor: () => Promise<Color>;

  /**
   * param: (value: number)
   *
   * Set Item Transparency
   *
   * *Chainable.*
   */
  setTransparency: (value: number) => Promise<ScreenSource>;

  /**
   * param: (value: number)
   *
   * Set Item Brightness
   *
   * *Chainable.*
   */
  setBrightness: (value: number) => Promise<ScreenSource>;

  /**
   * param: (value: number)
   *
   * Set Item Contrast
   *
   * *Chainable.*
   */
  setContrast: (value: number) => Promise<ScreenSource>;

  /**
   * param: (value: number)
   *
   * Set Item Hue
   *
   * *Chainable.*
   */
  setHue: (value: number) => Promise<ScreenSource>;

  /**
   * param: (value: number)
   *
   * Set Item Saturation
   *
   * *Chainable.*
   */
  setSaturation: (value: number) => Promise<ScreenSource>;

  /**
   * param: (value: Color)
   *
   * Set Border Color
   *
   * *Chainable.*
   */
  setBorderColor: (value: Color) => Promise<ScreenSource>;

  // ItemChroma
  /**
   * return: Promise<boolean>
   */
  isChromaEnabled: () => Promise<boolean>;
  /**
   * param: (value: boolean)
   *
   * *Chainable.*
   */
  setChromaEnabled: (value: boolean) => Promise<ScreenSource>;
  /**
   * return: Promise<KeyingType>
   */
  getKeyingType: () => Promise<KeyingType>;
  /**
   * param: (value: KeyingType)
   * *Chainable.*
   *
   */
  setKeyingType: (value: KeyingType) => Promise<ScreenSource>;

  // BOTH CHROMA LEGACY AND CHROMA RGB
  /**
   * return: Promise<ChromaAntiAliasLevel>
   */
  getChromaAntiAliasLevel: () => Promise<ChromaAntiAliasLevel>;
  /**
   * param: (value: ChromaAntiAliasLevel)
   *
   * *Chainable.*
   */
  setChromaAntiAliasLevel: (value: ChromaAntiAliasLevel) => Promise<ScreenSource>;

  // CHROMA LEGACY MODE
  /**
   * return: Promise<number>
   */
  getChromaLegacyBrightness: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaLegacyBrightness: (value: number) => Promise<ScreenSource>;
  /**
   * return: Promise<number>
   */
  getChromaLegacySaturation: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaLegacySaturation: (value: number) => Promise<ScreenSource>;
  /**
   * return: Promise<number>
   */
  getChromaLegacyHue: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaLegacyHue: (value: number) => Promise<ScreenSource>;
  /**
   * return: Promise<number>
   */
  getChromaLegacyThreshold: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaLegacyThreshold: (value: number) => Promise<ScreenSource>;
  /**
   * return: Promise<number>
   */
  getChromaLegacyAlphaSmoothing: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaLegacyAlphaSmoothing: (value: number) => Promise<ScreenSource>;

  // CHROMA KEY RGB MODE
  /**
   * return: Promise<ChromaPrimaryColors>
   */
  getChromaRGBKeyPrimaryColor: () => Promise<ChromaPrimaryColors>;
  /**
   * param: (value: ChromaPrimaryColors)
   *
   * *Chainable.*
   */
  setChromaRGBKeyPrimaryColor: (value: ChromaPrimaryColors) => Promise<ScreenSource>;
  /**
   * return: Promise<number>
   */
  getChromaRGBKeyThreshold: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaRGBKeyThreshold: (value: number) => Promise<ScreenSource>;
  /**
   * return: Promise<number>
   */
  getChromaRGBKeyExposure: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaRGBKeyExposure: (value: number) => Promise<ScreenSource>;

  // COLOR KEY MODE
  /**
   * return: Promise<number>
   */
  getChromaColorKeyThreshold: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaColorKeyThreshold: (value: number) => Promise<ScreenSource>;
  /**
   * return: Promise<number>
   */
  getChromaColorKeyExposure: () => Promise<number>;
  /**
   * param: (value: number)
   *
   * *Chainable.*
   */
  setChromaColorKeyExposure: (value: number) => Promise<ScreenSource>;
  /**
   * return: Promise<Color>
   */
  getChromaColorKeyColor: () => Promise<Color>;
  /**
   * param: (value: Color)
   *
   * *Chainable.*
   */
  setChromaColorKeyColor: (value: Color) => Promise<ScreenSource>;

  // ItemTransition

  /**
   * return: Promise<boolean>
   *
   * Check if item is visible on stage
   */
  isVisible: () => Promise<boolean>;

  /**
   * param: (value: boolean)
   *
   * Set item to visible or hidden
   *
   * *Chainable.*
   */
  setVisible: (value: boolean) => Promise<ScreenSource>;

  /**
   * return: Promise<boolean>
   *
   * Get item's transition type for when visibility is toggled
   */
  getTransition: () => Promise<Transition>;

  /**
   * param: (value: Transition)
   *
   * Set item's transition type for when visibility is toggled
   *
   * *Chainable.*
   */
  setTransition: (value: Transition) => Promise<ScreenSource>;

  /**
   * return: Promise<number>
   *
   * Get item's transition time in milliseconds
   */
  getTransitionTime: () => Promise<number>;

  /**
   * param: (value: number)
   *
   * Set item's transition time in milliseconds
   *
   * *Chainable.*
   */
  setTransitionTime: (value: number) => Promise<ScreenSource>;
}

applyMixins(ScreenSource, [ItemLayout, ItemColor, ItemChroma, ItemTransition]);
