package renderlab.reference;

import java.io.File;
import com.android.uiautomator.testrunner.UiAutomatorTestCase;
import com.android.uiautomator.core.UiDevice;

/**
 * Old Android SDK UiAutomator test API, used only on an ephemeral GitHub CI emulator.
 * Independent accessibility automation path: NOT adb shell input tap and NOT app code.
 * No network, authentication, or user content.
 */
public class ReferenceInputProbe extends UiAutomatorTestCase {
    public void testReferenceTabs() throws Exception {
        UiDevice device = getUiDevice();
        final int width = device.getDisplayWidth();
        final int y = Integer.parseInt(getParams().getString("tab_y"));
        if (width < 300 || y < 100) {
            throw new IllegalArgumentException("Invalid device bounds, width=" + width + ", y=" + y);
        }
        System.out.println("UIAUTOMATOR_START width=" + width + " y=" + y);
        boolean searchClicked = device.click((width * 3) / 10, y);
        System.out.println("UIAUTOMATOR_SEARCH_INJECTED=" + searchClicked);
        Thread.sleep(9500);
        boolean searchSaved = device.takeScreenshot(new File("/sdcard/reference-uiautomator-search.png"));
        System.out.println("UIAUTOMATOR_SEARCH_SCREENSHOT=" + searchSaved);
        boolean profileClicked = device.click((width * 9) / 10, y);
        System.out.println("UIAUTOMATOR_PROFILE_INJECTED=" + profileClicked);
        Thread.sleep(9500);
        boolean profileSaved = device.takeScreenshot(new File("/sdcard/reference-uiautomator-profile.png"));
        System.out.println("UIAUTOMATOR_PROFILE_SCREENSHOT=" + profileSaved);
        boolean homeClicked = device.click(width / 10, y);
        System.out.println("UIAUTOMATOR_HOME_INJECTED=" + homeClicked);
        Thread.sleep(2500);
        device.takeScreenshot(new File("/sdcard/reference-uiautomator-return.png"));
    }
}
