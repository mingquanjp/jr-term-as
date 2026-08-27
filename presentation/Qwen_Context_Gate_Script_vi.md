# Script trình bày: Bổ sung Qwen kiểm tra ngữ cảnh

## Thời lượng đề xuất: 3–5 phút

Xin chào hai anh.

Hôm nay chúng tôi xin trình bày ngắn gọn về thay đổi mới trong prototype JR Term Assistant: bổ sung Qwen để kiểm tra ngữ cảnh của các thuật ngữ dễ nhầm lẫn.

Trước đây, hệ thống chủ yếu phát hiện thuật ngữ bằng cách tìm kiếm trực tiếp chuỗi ký tự trong transcript. Cách này phù hợp với những thuật ngữ rõ ràng như `イノ本`, nhưng có thể nhận diện nhầm các từ ngắn hoặc những từ vừa có nghĩa thông thường, vừa có nghĩa chuyên ngành.

Ví dụ minh họa cho loại vấn đề này là một cách gọi ngắn như `うや`. Nếu từ điển JR xác định `うや` có ý nghĩa `運転休止`, nhưng transcript có câu 「えっと、どうやったかなあ。」 thì chuỗi ký tự này có thể xuất hiện trong cách nói thông thường, không mang ý nghĩa `運転休止`. Nếu chỉ khớp chuỗi, hệ thống sẽ khó phân biệt hai trường hợp này.

Vì vậy, chúng tôi bổ sung Qwen vào bước kiểm tra ngữ cảnh.

Khi hệ thống tìm thấy một thuật ngữ có nguy cơ gây nhầm lẫn, hệ thống gửi cho Qwen ba nhóm thông tin: thông tin thuật ngữ trong từ điển JR, câu đang chứa thuật ngữ, và câu trước cùng câu sau. Qwen kiểm tra xem cách sử dụng trong đoạn hội thoại có phù hợp với ý nghĩa chuyên ngành trong từ điển hay không.

Ví dụ, nếu `UK` xuất hiện cùng các nội dung như thay thế hệ thống, sửa đổi interface hoặc dữ liệu vận hành, Qwen có thể xác định `UK` đang được dùng với nghĩa `輸送計画システム`. Nhưng nếu câu nói là `UK市場向けの販売資料`, thì `UK` có nghĩa là thị trường Anh, không phải hệ thống nội bộ, nên kết quả sẽ bị loại bỏ.

Điểm quan trọng là Qwen không tự tạo ra định nghĩa mới. Từ điển đã được JR cung cấp và review vẫn là nguồn thông tin chính thức. Qwen chỉ kiểm tra cách thuật ngữ được sử dụng trong lần xuất hiện cụ thể đó.

Về kết quả, Qwen có ba quyết định: `accept`, `reject` và `uncertain`. Chỉ trường hợp `accept` mới được hiển thị trên màn hình. Các trường hợp không phù hợp hoặc chưa đủ rõ sẽ không hiển thị, để người dùng không bị nhiễu bởi quá nhiều kết quả sai.

Đây cũng là lý do chúng tôi đổi tên cột `意味` thành `意味の推測`. Ý nghĩa hiển thị vẫn dựa trên thông tin do JR cung cấp, nhưng được trình bày như ý nghĩa được suy đoán trong ngữ cảnh của cuộc họp, thay vì một kết luận tuyệt đối cho mọi trường hợp.

Chúng tôi đã thử nghiệm với 14 trường hợp tổng hợp, gồm 7 trường hợp đúng và 7 trường hợp sai, cho các thuật ngữ như `人財開発室`, `UK`, `輸送計画`, `安全推進`, `一見一様`, `均等` và `ボックス`. Kết quả hiện tại là 6 trường hợp đúng được hiển thị, 7 trường hợp sai được loại bỏ và 1 trường hợp đúng chưa được hiển thị. Vì vậy, precision là 100%, recall là 85,7%, còn accuracy tổng thể là 92,9%.

Đây mới là kết quả kiểm tra nội bộ trên một bộ dữ liệu nhỏ, chưa phải số liệu chính thức. Chúng tôi muốn nhờ hai anh review các câu thử nghiệm này, đồng thời cung cấp thêm ví dụ thực tế về trường hợp dùng đúng và dùng sai. Những ví dụ đó sẽ giúp chúng tôi cải thiện cả từ điển lẫn khả năng kiểm tra ngữ cảnh của Qwen.

Mục tiêu cuối cùng không phải là để AI thay thế kiến thức của JR, mà là dùng kiến thức JR làm nền tảng và giảm thời gian con người phải tự tìm kiếm, đối chiếu và kiểm tra thủ công trong transcript.

Xin cảm ơn hai anh. Chúng tôi rất mong nhận được góp ý về những trường hợp nên hiển thị, những trường hợp nên loại bỏ và cách diễn đạt ý nghĩa trên màn hình.
