# Board sign-out and write acknowledgements

A dropped logout keeps the board data hidden and offers a retry. A late 401 from a closed member panel leaves the selected member visible. An unconfirmed write asks the board to check what was saved.

The screenshots use the built ZurichJS pages, their normal header and mocked API responses. Every image is full page with reduced motion. The clips have motion enabled. All captures reported Figtree, zero horizontal overflow and zero page errors.

| State                   | 320 px                                 | 375 px                                 | 390 px                                 | 1280 px                                  | 1440 px                                  |
| ----------------------- | -------------------------------------- | -------------------------------------- | -------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| member late 401 ignored | [320](member-late-401-ignored-320.png) | [375](member-late-401-ignored-375.png) | [390](member-late-401-ignored-390.png) | [1280](member-late-401-ignored-1280.png) | [1440](member-late-401-ignored-1440.png) |
| signout failed          | [320](signout-failed-320.png)          | [375](signout-failed-375.png)          | [390](signout-failed-390.png)          | [1280](signout-failed-1280.png)          | [1440](signout-failed-1440.png)          |
| write outcome unknown   | [320](write-outcome-unknown-320.png)   | [375](write-outcome-unknown-375.png)   | [390](write-outcome-unknown-390.png)   | [1280](write-outcome-unknown-1280.png)   | [1440](write-outcome-unknown-1440.png)   |

## Recordings

- member late answer and unknown write [MP4](member-late-answer-and-unknown-write.mp4) · [GIF](member-late-answer-and-unknown-write.gif)
- signout failed then retry [MP4](signout-failed-then-retry.mp4) · [GIF](signout-failed-then-retry.gif)

## Verification

- [97-e2e-before-ae7cce8.log](97-e2e-before-ae7cce8.log)
- [97-ack-before.log](97-ack-before.log)
- [97-final-checks.log](97-final-checks.log)
