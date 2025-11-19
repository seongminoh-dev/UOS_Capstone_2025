package com.capstone.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Schema(description = "인증 응답 (로그인/회원가입)")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    @Schema(description = "사용자 ID", example = "1")
    private Long id;

    @Schema(description = "사용자명", example = "testuser")
    private String username;

    @Schema(description = "이메일", example = "test@example.com")
    private String email;

    @Schema(description = "닉네임", example = "테스트유저")
    private String nickname;

    @Schema(
            description = """
                    JWT 인증 토큰 (Bearer 토큰)

                    [사용 방법]
                    1. 이 토큰을 로컬 스토리지 또는 상태 관리에 저장
                    2. API 요청 시 Authorization 헤더에 포함
                       형식: Authorization: Bearer {token}

                    [예시]
                    fetch('/api/scenes', {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    })

                    [참고]
                    현재는 토큰 검증이 비활성화되어 있어 토큰 없이도 API 사용 가능합니다.
                    """,
            example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0dXNlciIsImlhdCI6MTYxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    )
    private String token;

    @Schema(description = "응답 메시지", example = "Login successful")
    private String message;
}
