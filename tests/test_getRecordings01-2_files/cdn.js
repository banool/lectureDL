/**
 * cdn.js
 * This script supplies the correct absolute path to a file hosted in the CloudFront CDN.
 *
 * MWD 06/03/14
 *
 */
var scripts = document.getElementsByTagName('script');
var scriptName = "/javascript/cdn.js";
var domain = getDomain();

// The next three variables are filled in by CdnJSPopulateRegexTask
var pattern = /^\/((javascript\/(?!(jquery|scriptaculous)).*)|(ui\/.*)|(fonts\/.*)|(themes\/.*)|(common\/.*)|(coursethemes\/.*)|(images\/((ci\/(actionbar|cnavbtns|ecommerce|gradebook|icons|listbtns|logos|misc|mybb|ng|portfolio|sets|textboxeditor)\/.*)|(console\/icons\/.*)|(cs\/.*)|db|swatches|spacer.gif|utilicons_sprite.png))|(images-ltr\/(ci\/((icons|ng|textboxeditor)\/.*)|(console\/icons\/.*)))|(images-rtl\/((ci\/(icons|ng|textboxeditor)\/.*)|(console\/icons\/.*))))/;
var cloudEnabled = false;
var directionalImagesArray = ['/images/ci/icons/arrow_next_li.gif', '/images/ci/icons/arrowdbl_lt_is.gif', '/images/ci/icons/nlstree/minusb.gif', '/images/ci/icons/arrowleft_off.gif', '/images/ci/icons/toc_right_li.gif', '/images/ci/icons/nlstree/node_bg.gif', '/images/ci/icons/clphomepage/menu_collapse2.gif', '/images/ci/icons/nlstree/node_top_bg.gif', '/images/ci/icons/toc_maximizeSide_li.gif', '/images/ci/icons/treecontrol/rminus.gif', '/images/ci/icons/arrowright_off.gif', '/images/ci/ng/menu_collapse2.gif', '/images/ci/icons/toc_collapseSide_li.gif', '/images/ci/ng/small_next.gif', '/images/ci/icons/list_bullet.gif', '/images/ci/icons/arrowdbl_rt_is.gif', '/images/ci/icons/treecontrol/joinbottom.gif', '/images/ci/icons/nlstree/plusnb.gif', '/images/ci/icons/toc_bottom_li.gif', '/images/ci/icons/treecontrol/plusbottom.gif', '/images/ci/textboxeditor/indent_left.gif', '/images/ci/ng/cm_arrow_left.gif', '/images/ci/ng/small_rewind.gif', '/images/ci/icons/treecontrol/minus.gif', '/images/ci/textboxeditor/indent_right.gif', '/images/ci/icons/nlstree/lineints.gif', '/images/ci/icons/arrow.gif', '/images/ci/icons/toc_minimizeSide_li.gif', '/images/ci/ng/menu_expand2.gif', '/images/ci/textboxeditor/help.gif', '/images/ci/icons/arrow_right_li.gif', '/images/ci/icons/nlstree/arrowright.gif', '/images/ci/icons/clphomepage/bg.gif', '/images/ci/icons/clphomepage/menu_expand2.gif', '/images/ci/ng/cm_arrow_right_end.gif', '/images/console/icons/help_2.gif', '/images/ci/ng/small_ffwd.gif', '/images/ci/icons/invert_ti.png', '/images/ci/ng/cm_arrow_right.gif', '/images/ci/icons/nlstree/lineang.gif', '/images/ci/ng/small_help_off2.gif', '/images/ci/icons/arrow_left.gif', '/images/ci/icons/toc_down_li.gif', '/images/ci/ng/small_previous.gif', '/images/ci/icons/treecontrol/join.gif', '/images/console/icons/help_1.gif', '/images/ci/icons/treecontrol/plus.gif', '/images/ci/ng/cm_arrow_left_end.gif', '/images/ci/icons/nlstree/minusnb.gif', '/images/console/icons/help_0.gif', '/images/ci/icons/treecontrol/rplusbottom.gif', '/images/ci/icons/clphomepage/bg2.gif', '/images/ci/icons/arrow-right.gif', '/images/ci/icons/arrow_previous_li.gif', '/images/ci/icons/toc_side_li.gif', '/images/ci/icons/arrow_right.gif', '/images/ci/icons/treecontrol/line.gif', '/images/ci/ng/small_help_on2.gif', '/images/ci/icons/treecontrol/rplus.gif', '/images/ci/icons/treecontrol/rminusbottom.gif', '/images/ci/icons/treecontrol/minusbottom.gif', '/images/ci/icons/nlstree/plusb.gif'];
var localeArray = ['en_GB', 'en_US', 'es_ES', 'fr_FR', 'it_IT', 'de_DE', 'nl_NL', 'ru_RU', 'sv_SE', 'zh_CN', 'ja_JP', 'zh_TW', 'ar_SA', 'cy_GB', 'da_DK', 'en_US_k12', 'en_US_pro', 'pt_BR', 'ko_KR', 'tr_TR', 'cs_CZ', 'pl_PL', 'th_TH', 'ms_MY', 'nb_NO'];
var ltrArray = ['Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'N', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'];

function getCdnURL(relativePath)
{
	if (cloudEnabled && pattern.test(relativePath)) {
		return domain + alterDirectionalImagePaths(relativePath);
	}
	else {
		return domain + relativePath;
	}
}

function getDomain()
{
	for (var i = scripts.length - 1; i >= 0; i--)
	{
		var fullPath = scripts[i].src;
		var domainLength = fullPath.length - scriptName.length;

		if (fullPath.substr( domainLength ) === scriptName)
		{
			return fullPath.substr( 0, domainLength);
		}
	}
}

function alterDirectionalImagePaths(relativePath)
{
	if (directionalImagesArray.indexOf(relativePath) > -1)
	{
		var language = (navigator.userLanguage || navigator.browserLanguage || navigator.language);
		var languageStr = language.split("-");
		var replaceLanguage;
		if (typeof languageStr[1] !== 'undefined' && languageStr[1] !== null) {
			replaceLanguage = languageStr[0] + "_" + languageStr[1].toUpperCase();
		} else {
			replaceLanguage = languageStr[0]
		}

		if (localeArray.indexOf(replaceLanguage) > -1)
		{
			relativePath = relativePath.replace("images", ltrArray[localeArray.indexOf(replaceLanguage)] === 'Y' ? "images-ltr" : "images-rtl");
		}
	}
	return relativePath;
}
