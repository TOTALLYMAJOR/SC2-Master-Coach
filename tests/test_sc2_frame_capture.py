from sc2_frame_capture import _safe_name


def test_capture_filename_is_safe():
    assert _safe_name("7:13 / Bad fight?!") == "7-13-Bad-fight"
