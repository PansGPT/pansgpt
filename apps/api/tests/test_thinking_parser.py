# ==============================================================================
# Unit Tests: Thinking Token Stream Parser (Roadmap 6B.16)
# ==============================================================================

from app.engines.thinking import ThinkingStreamParser, strip_thinking_tokens


def test_strip_thinking_tokens_basic():
    """Verify batch stripping of thinking blocks."""
    raw = "<think>Step-by-step clinical analysis</think>Amoxicillin is a beta-lactam."
    visible, thinking = strip_thinking_tokens(raw)
    assert visible == "Amoxicillin is a beta-lactam."
    assert thinking == "Step-by-step clinical analysis"


def test_strip_thinking_tokens_multiple_tags():
    """Verify multiple blocks and alternative tag names."""
    raw = "<thought>Consider renal clearance</thought>First point.<scratchpad>Check hepatic CYP3A4</scratchpad>Second point."
    visible, thinking = strip_thinking_tokens(raw)
    assert visible == "First point.Second point."
    assert thinking == "Consider renal clearance\n\nCheck hepatic CYP3A4"


def test_stream_parser_clean_text_no_thinking():
    """Verify models emitting standard text pass through without modification."""
    parser = ThinkingStreamParser()
    chunks = ["Warfarin ", "inhibits ", "vitamin ", "K epoxide reductase."]
    out_vis = []
    out_think = []
    for c in chunks:
        v, t = parser.feed(c)
        if v:
            out_vis.append(v)
        if t:
            out_think.append(t)
    rv, rt = parser.flush()
    if rv:
        out_vis.append(rv)
    if rt:
        out_think.append(rt)

    assert "".join(out_vis) == "Warfarin inhibits vitamin K epoxide reductase."
    assert "".join(out_think) == ""


def test_stream_parser_complete_tag_in_one_chunk():
    """Verify single chunk containing entire thinking block and answer."""
    parser = ThinkingStreamParser()
    v, t = parser.feed("<think>Reasoning here</think>The answer is 42.")
    rv, rt = parser.flush()

    assert v + rv == "The answer is 42."
    assert t + rt == "Reasoning here"


def test_stream_parser_tag_split_across_opening_boundary():
    """Verify opening tag split across permutations: '<', 'th', 'ink>'."""
    parser = ThinkingStreamParser()
    chunks = [
        "<",
        "thi",
        "nk>",
        "Calculating creatinine clearance...",
        "</think>",
        "GFR is 60 mL/min.",
    ]
    out_vis = []
    out_think = []
    for c in chunks:
        v, t = parser.feed(c)
        if v:
            out_vis.append(v)
        if t:
            out_think.append(t)
    rv, rt = parser.flush()
    if rv:
        out_vis.append(rv)
    if rt:
        out_think.append(rt)

    assert "".join(out_vis) == "GFR is 60 mL/min."
    assert "".join(out_think) == "Calculating creatinine clearance..."
    assert "<think>" not in "".join(out_vis)
    assert "</think>" not in "".join(out_vis)


def test_stream_parser_closing_tag_split_boundary():
    """Verify closing tag split: '<think>Reasoning', '</th', 'ink>', 'Done'."""
    parser = ThinkingStreamParser()
    chunks = ["<think>Dosing strategy", "</th", "ink>", "Administer 500mg IV."]
    out_vis = []
    out_think = []
    for c in chunks:
        v, t = parser.feed(c)
        if v:
            out_vis.append(v)
        if t:
            out_think.append(t)
    rv, rt = parser.flush()
    if rv:
        out_vis.append(rv)
    if rt:
        out_think.append(rt)

    assert "".join(out_vis) == "Administer 500mg IV."
    assert "".join(out_think) == "Dosing strategy"


def test_stream_parser_character_by_character_stress():
    """Extreme stress test: feed input 1 character at a time."""
    raw = "<think>Step 1: Check contraindications</think>Contraindicated in pregnancy."
    parser = ThinkingStreamParser()
    out_vis = []
    out_think = []
    for char in raw:
        v, t = parser.feed(char)
        if v:
            out_vis.append(v)
        if t:
            out_think.append(t)
    rv, rt = parser.flush()
    if rv:
        out_vis.append(rv)
    if rt:
        out_think.append(rt)

    assert "".join(out_vis) == "Contraindicated in pregnancy."
    assert "".join(out_think) == "Step 1: Check contraindications"


def test_stream_parser_mathematical_operators_not_treated_as_tags():
    """Ensure mathematical expressions like 'x < 5 and y > 2' are not eaten."""
    parser = ThinkingStreamParser()
    chunks = ["The serum level is <", " 5 ug/mL and clearance is >", " 10 mL/min."]
    out_vis = []
    out_think = []
    for c in chunks:
        v, t = parser.feed(c)
        if v:
            out_vis.append(v)
        if t:
            out_think.append(t)
    rv, rt = parser.flush()
    if rv:
        out_vis.append(rv)
    if rt:
        out_think.append(rt)

    assert "".join(out_vis) == "The serum level is < 5 ug/mL and clearance is > 10 mL/min."
    assert "".join(out_think) == ""


def test_stream_parser_unclosed_tag_at_eof():
    """Verify unclosed tag at end-of-stream does not crash or lose text."""
    parser = ThinkingStreamParser()
    chunks = ["Normal intro text. ", "<thi"]
    out_vis = []
    for c in chunks:
        v, _ = parser.feed(c)
        if v:
            out_vis.append(v)
    rv, _ = parser.flush()
    if rv:
        out_vis.append(rv)

    assert "".join(out_vis) == "Normal intro text. <thi"
